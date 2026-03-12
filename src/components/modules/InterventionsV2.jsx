import { useState, useMemo, lazy } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import {
  INTERVENTION_TYPES,
  REQUEST_CHANNELS,
  WARRANTY_STATUS_OPTIONS,
  TIPOLOGIA_SERVIZIO,
} from '../../lib/constants'
import { formatDateTime } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import StatusChip from '../shared/StatusChip'
import PriorityPill from '../shared/PriorityPill'
import SlaBadge from '../shared/SlaBadge'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import CloseInterventionModal from './interventions/CloseInterventionModal'
import { Plus, X, Check, Send, Share2, ChevronRight, ChevronLeft, Mail, MessageCircle, Wrench, FileText, Download } from 'lucide-react'

// Lazy-load PDF to reduce initial bundle
const InterventionPdfReport = lazy(() => import('./interventions/InterventionPdfReport'))

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_TABS = [
  { key: 'all', label: 'Tutti' },
  { key: 'in-progress', label: 'In corso' },
  { key: 'pending', label: 'In attesa' },
  { key: 'completed', label: 'Completati' },
]

const PRIORITY_OPTIONS = [
  { value: 'CRITICO', color: '#C0392B', bg: '#FADBD8' },
  { value: 'ALTO', color: '#E67E22', bg: '#FDEBD0' },
  { value: 'MEDIO', color: '#B7950B', bg: '#FEF9E7' },
  { value: 'BASSO', color: '#27AE60', bg: '#D5F5E3' },
]

const WIZARD_STEPS = [
  { num: 1, label: 'Dati intervento' },
  { num: 2, label: 'Assegna tecnico' },
  { num: 3, label: 'Notifica' },
  { num: 4, label: 'Fatto' },
]

const EMPTY_FORM = {
  priority: 'MEDIO',
  deviceName: '',
  deviceSerial: '',
  structure: '',
  department: '',
  referent: '',
  referentEmail: '',
  interventionType: 'Guasto',
  slaHours: 8,
  description: '',
  // ── New fields ──
  address: '',
  city: '',
  orderNumber: '',
  orderDate: '',
  requestChannel: '',
  requestReference: '',
  tipologiaServizio: '',
  deviceSoftwareVersion: '',
  warrantyStatus: '',
  warrantyExpiry: '',
}

// ---------------------------------------------------------------------------
// Helper — generate a random INT-XXXX code
// ---------------------------------------------------------------------------
function generateCode() {
  return `INT-${String(Math.floor(1000 + Math.random() * 9000))}`
}

// ---------------------------------------------------------------------------
// WizardProgressBar
// ---------------------------------------------------------------------------
function WizardProgressBar({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {WIZARD_STEPS.map((step, idx) => {
        const isActive = currentStep === step.num
        const isCompleted = currentStep > step.num
        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {isCompleted ? <Check size={16} /> : step.num}
              </div>
              <span className={`text-[11px] mt-1 whitespace-nowrap ${isActive ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] ${currentStep > step.num ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function InterventionsV2() {
  const { interventions, warehouse, users, addIntervention, closeIntervention } = useGlobalStore()
  const { addToast } = useToast()

  // ---- List state ----
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [techFilter, setTechFilter] = useState('')

  // ---- Detail view state ----
  const [selectedIntervention, setSelectedIntervention] = useState(null)

  // ---- Modal state ----
  const [showNewModal, setShowNewModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(null) // intervention object or null
  const [showShareModal, setShowShareModal] = useState(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // ---- Wizard state ----
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedTechs, setSelectedTechs] = useState([])
  const [notifySecretary, setNotifySecretary] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  // ---------- Derived data ----------
  const techUsers = useMemo(() => users.filter(u => u.role === 'technician'), [users])

  const uniqueTechs = useMemo(() => {
    const names = [...new Set(interventions.map(i => i.techName).filter(Boolean))]
    return names.sort()
  }, [interventions])

  // ---------- Filtered interventions ----------
  const filtered = useMemo(() => {
    let list = [...interventions]

    if (statusTab !== 'all') {
      if (statusTab === 'pending') {
        list = list.filter(i => i.status === 'pending' || i.status === 'acknowledged')
      } else {
        list = list.filter(i => i.status === statusTab)
      }
    }

    if (techFilter) {
      list = list.filter(i => i.techName === techFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        (i.code || '').toLowerCase().includes(q) ||
        (i.deviceName || '').toLowerCase().includes(q) ||
        (i.structure || '').toLowerCase().includes(q) ||
        (i.techName || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [interventions, statusTab, techFilter, search])

  // ---------- Handlers: New Intervention Wizard ----------
  const openNewModal = () => {
    setForm(EMPTY_FORM)
    setSelectedTechs([])
    setNotifySecretary(false)
    setCreatedCode('')
    setWizardStep(1)
    setShowNewModal(true)
  }

  const closeNewModal = () => setShowNewModal(false)

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleTech = (userId) => {
    setSelectedTechs(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleCreateIntervention = async () => {
    const code = generateCode()
    const techNames = selectedTechs
      .map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(', ')

    const newInt = {
      code,
      deviceName: form.deviceName,
      deviceSerial: form.deviceSerial,
      interventionType: form.interventionType,
      structure: form.structure,
      department: form.department,
      referent: form.referent,
      referentEmail: form.referentEmail,
      priority: form.priority,
      status: 'pending',
      assignedTechs: selectedTechs,
      techName: techNames || 'Non assegnato',
      slaMinutes: (form.slaHours || 8) * 60,
      description: form.description,
      healthPre: null,
      healthPost: null,
      outcome: null,
      notes: '',
      partsUsed: [],
      // ── New fields ──
      address: form.address,
      city: form.city,
      orderNumber: form.orderNumber,
      orderDate: form.orderDate,
      requestChannel: form.requestChannel,
      requestReference: form.requestReference,
      tipologiaServizio: form.tipologiaServizio,
      deviceSoftwareVersion: form.deviceSoftwareVersion,
      warrantyStatus: form.warrantyStatus,
      warrantyExpiry: form.warrantyExpiry,
    }

    try {
      await addIntervention(newInt)
      setCreatedCode(code)
      setWizardStep(4)
      addToast('success', `Intervento ${code} creato con successo`)
    } catch {
      addToast('error', 'Errore nel salvataggio')
    }
  }

  // ---------- Email / WhatsApp helpers ----------
  const buildMailtoNew = () => {
    const subject = encodeURIComponent(`Nuovo Intervento - ${form.deviceName}`)
    const body = encodeURIComponent(
      `Buongiorno,\n\nÈ stato creato un nuovo intervento:\n` +
      `- Apparecchiatura: ${form.deviceName}\n` +
      `- Struttura: ${form.structure} / ${form.department}\n` +
      `- Tipo: ${form.interventionType}\n` +
      `- Priorità: ${form.priority}\n` +
      `- SLA: ${form.slaHours} ore\n` +
      `- Descrizione: ${form.description}\n\nCordiali saluti,\nMGX Medical`
    )
    return `mailto:${form.referentEmail || ''}?subject=${subject}&body=${body}`
  }

  const buildWhatsAppNew = () => {
    const text = encodeURIComponent(
      `Nuovo Intervento MGX Medical\n` +
      `Apparecchiatura: ${form.deviceName}\n` +
      `Struttura: ${form.structure} / ${form.department}\n` +
      `Tipo: ${form.interventionType}\n` +
      `Priorità: ${form.priority}\n` +
      `SLA: ${form.slaHours} ore\n` +
      `Descrizione: ${form.description}`
    )
    return `https://wa.me/?text=${text}`
  }

  // ---------- Handlers: Close Intervention ----------
  const handleCloseIntervention = async (closeData) => {
    if (!showCloseModal) return
    try {
      await closeIntervention(showCloseModal.id, closeData)
      addToast('success', `Intervento ${showCloseModal.code} chiuso — Esito: ${closeData.outcome}`)
      setShowCloseModal(null)
    } catch {
      addToast('error', 'Errore nella chiusura')
    }
  }

  const handleCloseAndPdf = async (closeData) => {
    if (!showCloseModal) return
    const intv = showCloseModal
    try {
      await closeIntervention(intv.id, closeData)
      addToast('success', `Intervento ${intv.code} chiuso — Esito: ${closeData.outcome}`)
      setShowCloseModal(null)
      const mergedIntv = { ...intv, status: 'completed', closedAt: new Date().toISOString(), ...closeData }
      await generatePdf(mergedIntv)
    } catch {
      addToast('error', 'Errore nella chiusura')
    }
  }

  // ---------- PDF Generation ----------
  const generatePdf = async (intv) => {
    setPdfGenerating(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: PdfReport } = await import('./interventions/InterventionPdfReport')
      const blob = await pdf(<PdfReport intervention={intv} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rapporto_${intv.code}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      addToast('success', `PDF ${intv.code} generato`)
    } catch (err) {
      console.error('PDF generation error:', err)
      addToast('error', 'Errore nella generazione del PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  // ---------- Handlers: Share Modal ----------
  const openShareModal = (intervention) => setShowShareModal(intervention)

  const buildMailtoShare = (intv) => {
    const subject = encodeURIComponent(`Report Intervento ${intv.code}`)
    const body = encodeURIComponent(
      `Report Intervento ${intv.code}\n\n` +
      `Apparecchiatura: ${intv.deviceName}\n` +
      `Struttura: ${intv.structure}\n` +
      `Tecnico: ${intv.techName}\n` +
      `Stato: ${intv.status}\n` +
      `Health Post: ${intv.healthPost ?? 'N/A'}%\n` +
      `Note: ${intv.notes || '-'}\n` +
      `Data creazione: ${intv.createdAt ? new Date(intv.createdAt).toLocaleString('it-IT') : '-'}\n` +
      `Data chiusura: ${intv.closedAt ? new Date(intv.closedAt).toLocaleString('it-IT') : '-'}\n\n` +
      `Cordiali saluti,\nMGX Medical`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }

  const buildWhatsAppShare = (intv) => {
    const text = encodeURIComponent(
      `Report Intervento ${intv.code}\n` +
      `Apparecchiatura: ${intv.deviceName}\n` +
      `Struttura: ${intv.structure}\n` +
      `Tecnico: ${intv.techName}\n` +
      `Stato: ${intv.status}\n` +
      `Health: ${intv.healthPost ?? 'N/A'}%\n` +
      `Note: ${intv.notes || '-'}\n` +
      `Creato: ${intv.createdAt ? new Date(intv.createdAt).toLocaleString('it-IT') : '-'}`
    )
    return `https://wa.me/?text=${text}`
  }

  // ---------- Active interventions count per tech ----------
  const techActiveCounts = useMemo(() => {
    const counts = {}
    interventions.forEach(i => {
      if (i.status !== 'completed') {
        (i.assignedTechs || []).forEach(tid => { counts[tid] = (counts[tid] || 0) + 1 })
      }
    })
    return counts
  }, [interventions])

  // Input class constant
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <div className="p-6">
      {/* Header */}
      <SectionHeader title="Interventi" subtitle={`${interventions.length} totali - ${filtered.length} visualizzati`}>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nuovo Intervento
        </button>
      </SectionHeader>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca per codice, apparecchiatura, struttura, tecnico..."
          className="flex-1 max-w-md"
        />
        <select
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tutti i tecnici</option>
          {uniqueTechs.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${statusTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} message="Nessun intervento trovato" description="Prova a modificare i filtri di ricerca." />
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Codice</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Apparecchiatura</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Struttura</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tecnico</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">SLA</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Priorità</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(intv => (
                <tr key={intv.id} onClick={() => setSelectedIntervention(intv)} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{intv.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{intv.deviceName}</div>
                    <div className="text-xs text-gray-400">{intv.interventionType}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{intv.structure}</td>
                  <td className="px-4 py-3 text-gray-600">{intv.techName}</td>
                  <td className="px-4 py-3">
                    {intv.status !== 'completed' ? (
                      <SlaBadge createdAt={intv.createdAt} slaMinutes={intv.slaMinutes} />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusChip status={intv.status} /></td>
                  <td className="px-4 py-3"><PriorityPill priority={intv.priority} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {intv.status !== 'completed' && (
                        <button
                          onClick={() => setShowCloseModal(intv)}
                          className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Chiudi
                        </button>
                      )}
                      {intv.status === 'completed' && (
                        <button
                          onClick={() => generatePdf(intv)}
                          disabled={pdfGenerating}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Genera Rapporto PDF"
                        >
                          <FileText size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => openShareModal(intv)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Condividi"
                      >
                        <Share2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================== */}
      {/* NEW INTERVENTION MODAL — 4-step wizard                            */}
      {/* ================================================================== */}
      <Modal isOpen={showNewModal} onClose={closeNewModal} title="Nuovo Intervento" maxWidth="max-w-2xl">
        <WizardProgressBar currentStep={wizardStep} />

        {/* ---- Step 1: Dati intervento ---- */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            {/* Priority selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priorità</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateForm('priority', opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all
                      ${form.priority === opt.value ? 'scale-105 shadow-md' : 'opacity-60 hover:opacity-80'}`}
                    style={{
                      backgroundColor: opt.bg,
                      color: opt.color,
                      borderColor: form.priority === opt.value ? opt.color : 'transparent',
                    }}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apparecchiatura</label>
                <input type="text" value={form.deviceName} onChange={e => updateForm('deviceName', e.target.value)}
                  className={inputCls} placeholder="Nome apparecchiatura" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Modello / Matricola</label>
                <input type="text" value={form.deviceSerial} onChange={e => updateForm('deviceSerial', e.target.value)}
                  className={inputCls} placeholder="Numero seriale" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Struttura</label>
                <input type="text" value={form.structure} onChange={e => updateForm('structure', e.target.value)}
                  className={inputCls} placeholder="Ospedale / Clinica" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reparto</label>
                <input type="text" value={form.department} onChange={e => updateForm('department', e.target.value)}
                  className={inputCls} placeholder="Reparto" />
              </div>
            </div>

            {/* ── NEW: Indirizzo ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Via</label>
                <input type="text" value={form.address} onChange={e => updateForm('address', e.target.value)}
                  className={inputCls} placeholder="Indirizzo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Città</label>
                <input type="text" value={form.city} onChange={e => updateForm('city', e.target.value)}
                  className={inputCls} placeholder="Città" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Referente</label>
                <input type="text" value={form.referent} onChange={e => updateForm('referent', e.target.value)}
                  className={inputCls} placeholder="Nome referente" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email referente</label>
                <input type="email" value={form.referentEmail} onChange={e => updateForm('referentEmail', e.target.value)}
                  className={inputCls} placeholder="email@esempio.it" />
              </div>
            </div>

            {/* ── NEW: Ordine ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ordine Nr.</label>
                <input type="text" value={form.orderNumber} onChange={e => updateForm('orderNumber', e.target.value)}
                  className={inputCls} placeholder="N. ordine" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data ordine</label>
                <input type="date" value={form.orderDate} onChange={e => updateForm('orderDate', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rif.</label>
                <input type="text" value={form.requestReference} onChange={e => updateForm('requestReference', e.target.value)}
                  className={inputCls} placeholder="Riferimento" />
              </div>
            </div>

            {/* ── NEW: Richiesta Intervento ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Richiesta intervento</label>
                <select value={form.requestChannel} onChange={e => updateForm('requestChannel', e.target.value)}
                  className={`${inputCls} bg-white`}>
                  <option value="">-- Seleziona --</option>
                  {REQUEST_CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipologia servizio</label>
                <select value={form.tipologiaServizio} onChange={e => updateForm('tipologiaServizio', e.target.value)}
                  className={`${inputCls} bg-white`}>
                  <option value="">-- Seleziona --</option>
                  {TIPOLOGIA_SERVIZIO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo intervento</label>
                <select value={form.interventionType} onChange={e => updateForm('interventionType', e.target.value)}
                  className={`${inputCls} bg-white`}>
                  {INTERVENTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SLA (ore)</label>
                <input type="number" min="1" value={form.slaHours} onChange={e => updateForm('slaHours', Number(e.target.value))}
                  className={inputCls} />
              </div>
            </div>

            {/* ── NEW: Dispositivo extra ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ver. Software</label>
                <input type="text" value={form.deviceSoftwareVersion} onChange={e => updateForm('deviceSoftwareVersion', e.target.value)}
                  className={inputCls} placeholder="Es. v3.2.1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stato garanzia</label>
                <select value={form.warrantyStatus} onChange={e => updateForm('warrantyStatus', e.target.value)}
                  className={`${inputCls} bg-white`}>
                  <option value="">-- Seleziona --</option>
                  {WARRANTY_STATUS_OPTIONS.map(ws => <option key={ws.value} value={ws.value}>{ws.label}</option>)}
                </select>
              </div>
            </div>

            {form.warrantyStatus === 'garanzia' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Garanzia fino al</label>
                  <input type="date" value={form.warrantyExpiry} onChange={e => updateForm('warrantyExpiry', e.target.value)}
                    className={inputCls} />
                </div>
                <div />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Motivazione / Richiesta</label>
              <textarea rows={3} value={form.description} onChange={e => updateForm('description', e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Descrivi il problema / motivazione dell'intervento..." />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWizardStep(2)}
                disabled={!form.deviceName.trim() || !form.structure.trim()}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Avanti <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 2: Assegna tecnico ---- */}
        {wizardStep === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">Seleziona uno o piu tecnici da assegnare:</p>

            {techUsers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun tecnico disponibile.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {techUsers.map(user => {
                  const isSelected = selectedTechs.includes(user.id)
                  const activeCount = techActiveCounts[user.id] || 0
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTech(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {activeCount} interventi attivi
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between pt-3">
              <button onClick={() => setWizardStep(1)}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} /> Indietro
              </button>
              <button onClick={() => setWizardStep(3)}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Avanti <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: Notifica ---- */}
        {wizardStep === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Riepilogo intervento:</p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Priorità:</span>
                <PriorityPill priority={form.priority} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Apparecchiatura:</span>
                <span className="font-medium text-gray-800">{form.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modello/Matricola:</span>
                <span className="text-gray-700">{form.deviceSerial || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Struttura:</span>
                <span className="text-gray-700">{form.structure} / {form.department || '-'}</span>
              </div>
              {(form.address || form.city) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Indirizzo:</span>
                  <span className="text-gray-700">{[form.address, form.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Referente:</span>
                <span className="text-gray-700">{form.referent || '-'}</span>
              </div>
              {form.orderNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ordine:</span>
                  <span className="text-gray-700">{form.orderNumber} {form.orderDate ? `del ${form.orderDate}` : ''}</span>
                </div>
              )}
              {form.requestChannel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Richiesta via:</span>
                  <span className="text-gray-700">{REQUEST_CHANNELS.find(c => c.value === form.requestChannel)?.label || form.requestChannel}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="text-gray-700">{form.interventionType}</span>
              </div>
              {form.tipologiaServizio && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipologia servizio:</span>
                  <span className="text-gray-700">{form.tipologiaServizio}</span>
                </div>
              )}
              {form.warrantyStatus && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Garanzia:</span>
                  <span className="text-gray-700">{WARRANTY_STATUS_OPTIONS.find(w => w.value === form.warrantyStatus)?.label}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">SLA:</span>
                <span className="text-gray-700">{form.slaHours} ore</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tecnici:</span>
                <span className="text-gray-700">
                  {selectedTechs.length > 0
                    ? selectedTechs.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ')
                    : 'Nessuno'}
                </span>
              </div>
              {form.description && (
                <div className="pt-1 border-t border-gray-200">
                  <span className="text-gray-500 block mb-1">Motivazione/Richiesta:</span>
                  <span className="text-gray-700">{form.description}</span>
                </div>
              )}
            </div>

            {/* Notification buttons */}
            <div className="flex gap-3">
              <a href={buildMailtoNew()} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Mail size={16} className="text-blue-600" /> Email
              </a>
              <a href={buildWhatsAppNew()} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <MessageCircle size={16} className="text-green-600" /> WhatsApp
              </a>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={notifySecretary} onChange={e => setNotifySecretary(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Notifica segreteria
            </label>

            <div className="flex justify-between pt-2">
              <button onClick={() => setWizardStep(2)}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} /> Indietro
              </button>
              <button onClick={handleCreateIntervention}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Send size={15} /> Crea Intervento
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 4: Fatto ---- */}
        {wizardStep === 4 && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Intervento Creato</h3>
            <p className="text-2xl font-mono font-bold text-blue-700">{createdCode}</p>
            <p className="text-sm text-gray-500 text-center">
              L'intervento e stato registrato con successo.<br />
              I tecnici assegnati riceveranno una notifica.
            </p>
            <button onClick={closeNewModal}
              className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Chiudi
            </button>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* CLOSE INTERVENTION MODAL (extracted component)                     */}
      {/* ================================================================== */}
      <CloseInterventionModal
        intervention={showCloseModal}
        isOpen={!!showCloseModal}
        onClose={() => setShowCloseModal(null)}
        onSubmit={handleCloseIntervention}
        onSubmitAndPdf={handleCloseAndPdf}
        warehouse={warehouse}
      />

      {/* ================================================================== */}
      {/* INTERVENTION DETAIL MODAL                                          */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!selectedIntervention}
        onClose={() => setSelectedIntervention(null)}
        title={`Intervento ${selectedIntervention?.code || ''}`}
        subtitle={selectedIntervention?.deviceName}
        maxWidth="max-w-3xl"
      >
        {selectedIntervention && (() => {
          const intv = selectedIntervention
          return (
            <div className="space-y-5">
              {/* Status + Priority header strip */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusChip status={intv.status} />
                <PriorityPill priority={intv.priority} />
                {intv.status !== 'completed' && intv.createdAt && (
                  <SlaBadge createdAt={intv.createdAt} slaMinutes={intv.slaMinutes} />
                )}
              </div>

              {/* Main info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Apparecchiatura</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nome</span>
                      <span className="font-medium text-gray-800">{intv.deviceName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Modello / Matricola</span>
                      <span className="text-gray-700">{intv.deviceSerial || '-'}</span>
                    </div>
                    {intv.deviceSoftwareVersion && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ver. Software</span>
                        <span className="text-gray-700">{intv.deviceSoftwareVersion}</span>
                      </div>
                    )}
                    {intv.warrantyStatus && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Garanzia</span>
                        <span className="text-gray-700">
                          {WARRANTY_STATUS_OPTIONS.find(w => w.value === intv.warrantyStatus)?.label || intv.warrantyStatus}
                          {intv.warrantyExpiry && ` (fino al ${intv.warrantyExpiry})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Struttura</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Struttura</span>
                      <span className="font-medium text-gray-800">{intv.structure || '-'}</span>
                    </div>
                    {intv.department && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reparto</span>
                        <span className="text-gray-700">{intv.department}</span>
                      </div>
                    )}
                    {(intv.address || intv.city) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Indirizzo</span>
                        <span className="text-gray-700">{[intv.address, intv.city].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {intv.referent && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Referente</span>
                        <span className="text-gray-700">{intv.referent}</span>
                      </div>
                    )}
                    {intv.referentEmail && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-700">{intv.referentEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dettagli Intervento</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo</span>
                      <span className="text-gray-700">{intv.interventionType || '-'}</span>
                    </div>
                    {intv.tipologiaServizio && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipologia servizio</span>
                        <span className="text-gray-700">{intv.tipologiaServizio}</span>
                      </div>
                    )}
                    {intv.requestChannel && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Richiesta via</span>
                        <span className="text-gray-700">{REQUEST_CHANNELS.find(c => c.value === intv.requestChannel)?.label || intv.requestChannel}</span>
                      </div>
                    )}
                    {intv.requestReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rif. richiesta</span>
                        <span className="text-gray-700">{intv.requestReference}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">SLA</span>
                      <span className="text-gray-700">{intv.slaMinutes ? `${Math.round(intv.slaMinutes / 60)} ore` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tecnico</span>
                      <span className="font-medium text-gray-800">{intv.techName || 'Non assegnato'}</span>
                    </div>
                  </div>

                  {(intv.orderNumber || intv.orderDate) && (
                    <>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordine</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                        {intv.orderNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nr. Ordine</span>
                            <span className="text-gray-700">{intv.orderNumber}</span>
                          </div>
                        )}
                        {intv.orderDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Data ordine</span>
                            <span className="text-gray-700">{intv.orderDate}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Creato il</span>
                      <span className="text-gray-700">{formatDateTime(intv.createdAt) || '-'}</span>
                    </div>
                    {intv.closedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Chiuso il</span>
                        <span className="text-gray-700">{formatDateTime(intv.closedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {intv.description && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Motivazione / Richiesta</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{intv.description}</div>
                </div>
              )}

              {/* Outcome & Notes (for completed interventions) */}
              {intv.status === 'completed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intv.outcome && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Esito</h4>
                      <div className="bg-green-50 rounded-lg p-3 text-sm font-medium text-green-800">{intv.outcome}</div>
                    </div>
                  )}
                  {(intv.healthPre != null || intv.healthPost != null) && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Health Score</h4>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pre-intervento</span>
                          <span className="text-gray-700">{intv.healthPre != null ? `${intv.healthPre}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Post-intervento</span>
                          <span className="font-medium text-green-700">{intv.healthPost != null ? `${intv.healthPost}%` : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {intv.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{intv.notes}</div>
                </div>
              )}

              {/* Parts used */}
              {intv.partsUsed && intv.partsUsed.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ricambi Utilizzati</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs">
                          <th className="text-left pb-1">Articolo</th>
                          <th className="text-right pb-1">Qt.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intv.partsUsed.map((p, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="py-1 text-gray-700">{p.name || p.partName || p.itemName || '-'}</td>
                            <td className="py-1 text-right text-gray-700">{p.qty || p.quantity || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {intv.status !== 'completed' && (
                  <button
                    onClick={() => { setSelectedIntervention(null); setShowCloseModal(intv) }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <Check size={16} /> Chiudi Intervento
                  </button>
                )}
                {intv.status === 'completed' && (
                  <button
                    onClick={() => generatePdf(intv)}
                    disabled={pdfGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    <FileText size={16} /> {pdfGenerating ? 'Generando...' : 'Rapporto PDF'}
                  </button>
                )}
                <button
                  onClick={() => { setSelectedIntervention(null); openShareModal(intv) }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Share2 size={16} /> Condividi
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ================================================================== */}
      {/* SHARE MODAL                                                        */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!showShareModal}
        onClose={() => setShowShareModal(null)}
        title={`Condividi ${showShareModal?.code || ''}`}
        maxWidth="max-w-md"
      >
        {showShareModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Codice:</span>
                <span className="font-mono font-bold text-blue-700">{showShareModal.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Apparecchiatura:</span>
                <span className="text-gray-700">{showShareModal.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Struttura:</span>
                <span className="text-gray-700">{showShareModal.structure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tecnico:</span>
                <span className="text-gray-700">{showShareModal.techName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Health Post:</span>
                <span className="text-gray-700">{showShareModal.healthPost != null ? `${showShareModal.healthPost}%` : 'N/A'}</span>
              </div>
              {showShareModal.notes && (
                <div className="pt-1 border-t border-gray-200">
                  <span className="text-gray-500 block mb-1">Note:</span>
                  <span className="text-gray-700">{showShareModal.notes}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-500">Creato:</span>
                <span className="text-gray-700">
                  {showShareModal.createdAt ? new Date(showShareModal.createdAt).toLocaleString('it-IT') : '-'}
                </span>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex gap-3">
              <a href={buildMailtoShare(showShareModal)} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors">
                <Mail size={18} /> Email
              </a>
              <a href={buildWhatsAppShare(showShareModal)} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200 hover:bg-green-100 transition-colors">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>

            {/* PDF download for completed interventions */}
            {showShareModal.status === 'completed' && (
              <button
                onClick={() => generatePdf(showShareModal)}
                disabled={pdfGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40"
              >
                <Download size={18} /> {pdfGenerating ? 'Generando PDF...' : 'Scarica Rapporto PDF'}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
