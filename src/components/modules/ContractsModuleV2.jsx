import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency, formatDate } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import StatusChip from '../shared/StatusChip'
import { FileText as FileSignature, Plus, Edit, Clock, DollarSign, Building2, Mail, AlertTriangle, Eye, Trash2 } from 'lucide-react'

const STATUS_TABS = ['Tutti', 'Attivi', 'In Scadenza', 'Scaduti']
const TYPE_OPTIONS = ['Tutti', 'Full Service', 'Time & Material', 'Preventiva Only']

const TYPE_COLORS = {
  'Full Service': { bg: '#D6EAF8', color: '#2E86C1' },
  'Time & Material': { bg: '#E8DAEF', color: '#8E44AD' },
  'Preventiva Only': { bg: '#D1F2EB', color: '#17A2B8' },
}

const emptyContract = {
  code: '', client: '', contact: '', email: '',
  contractType: 'Full Service', value: 0,
  startDate: '', endDate: '',
  slaResponseHours: '', slaResolutionHours: '',
  devicesCount: 0, coveredCategories: [], status: 'active',
}

function getEffectiveStatus(c) {
  if (!c.endDate) return c.status || 'active'
  const daysLeft = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 30) return 'expiring'
  return 'active'
}

export default function ContractsModuleV2() {
  const { contracts, addContract, updateContract, deleteContract } = useGlobalStore()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('Tutti')
  const [typeFilter, setTypeFilter] = useState('Tutti')

  const [formModal, setFormModal] = useState({ open: false, contract: null })
  const [form, setForm] = useState(emptyContract)

  const [detailModal, setDetailModal] = useState({ open: false, contract: null })
  const [deleteTarget, setDeleteTarget] = useState(null)

  // --- KPIs ---
  const kpis = useMemo(() => {
    const attivi = contracts.filter(c => getEffectiveStatus(c) === 'active').length
    const inScadenza = contracts.filter(c => getEffectiveStatus(c) === 'expiring').length
    const valTotale = contracts.filter(c => getEffectiveStatus(c) === 'active').reduce((s, c) => s + (c.value || 0), 0)
    return { attivi, inScadenza, valTotale }
  }, [contracts])

  // --- Filtering ---
  const filtered = useMemo(() => {
    let list = [...contracts]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(c =>
        c.client?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.contact?.toLowerCase().includes(q)
      )
    }
    if (statusTab === 'Attivi') list = list.filter(c => getEffectiveStatus(c) === 'active')
    else if (statusTab === 'In Scadenza') list = list.filter(c => getEffectiveStatus(c) === 'expiring')
    else if (statusTab === 'Scaduti') list = list.filter(c => getEffectiveStatus(c) === 'expired')

    if (typeFilter !== 'Tutti') list = list.filter(c => c.contractType === typeFilter)
    return list
  }, [contracts, search, statusTab, typeFilter])

  // --- Form modal ---
  const openAdd = () => {
    setForm({ ...emptyContract })
    setFormModal({ open: true, contract: null })
  }
  const openEdit = (contract) => {
    setForm({
      ...contract,
      startDate: contract.startDate ? contract.startDate.slice(0, 10) : '',
      endDate: contract.endDate ? contract.endDate.slice(0, 10) : '',
      coveredCategories: contract.coveredCategories || [],
    })
    setFormModal({ open: true, contract })
  }
  const closeFormModal = () => setFormModal({ open: false, contract: null })

  const handleSave = async () => {
    if (!form.code.trim() || !form.client.trim()) {
      addToast('error', 'Codice e cliente sono obbligatori.')
      return
    }
    const payload = {
      ...form,
      value: Number(form.value),
      devicesCount: Number(form.devicesCount),
      slaResponseHours: form.slaResponseHours ? Number(form.slaResponseHours) : null,
      slaResolutionHours: form.slaResolutionHours ? Number(form.slaResolutionHours) : null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    }
    try {
      if (formModal.contract) {
        await updateContract(formModal.contract.id, payload)
        addToast('success', `Contratto ${form.code} aggiornato.`)
      } else {
        await addContract(payload)
        addToast('success', `Contratto ${form.code} creato.`)
      }
    } catch (err) {
      addToast('error', 'Errore durante il salvataggio del contratto.')
      return
    }
    closeFormModal()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteContract(deleteTarget.id)
      addToast('success', `Contratto ${deleteTarget.code} eliminato.`)
    } catch (err) {
      addToast('error', err.message || 'Errore durante l\'eliminazione.')
    }
    setDeleteTarget(null)
  }

  // --- Detail modal ---
  const openDetail = (c) => setDetailModal({ open: true, contract: c })
  const closeDetail = () => setDetailModal({ open: false, contract: null })

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const typeBadge = (type) => {
    const style = TYPE_COLORS[type] || { bg: '#F2F4F4', color: '#7F8C8D' }
    return style
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Contratti" subtitle="Gestione contratti di assistenza e SLA">
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Nuovo contratto
        </button>
      </SectionHeader>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={FileSignature} value={kpis.attivi} label="Contratti Attivi" color="#27AE60" />
        <KpiCard icon={Clock} value={kpis.inScadenza} label="In Scadenza" color="#E67E22" />
        <KpiCard icon={DollarSign} value={formatCurrency(kpis.valTotale)} label="Valore Totale (attivi)" color="#2E86C1" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca cliente, codice, referente..." className="flex-1" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setStatusTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileSignature} message="Nessun contratto trovato" description="Prova a cambiare i filtri o crea un nuovo contratto." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Codice</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Valore/anno</th>
                <th className="px-4 py-3">Inizio</th>
                <th className="px-4 py-3">Scadenza</th>
                <th className="px-4 py-3">SLA Resp / Risoluzione</th>
                <th className="px-4 py-3 text-center">Dispositivi</th>
                <th className="px-4 py-3 text-center">Stato</th>
                <th className="px-4 py-3 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const tBadge = typeBadge(c.contractType)
                const effStatus = getEffectiveStatus(c)
                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${effStatus === 'expiring' ? 'border-l-4 border-l-orange-400' : ''}`}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">{c.client}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ backgroundColor: tBadge.bg, color: tBadge.color }}>
                        {c.contractType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.value ? formatCurrency(c.value) : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.endDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="block">{c.slaResponseHours ? `${c.slaResponseHours}h` : '-'}</span>
                      <span className="block text-gray-400">{c.slaResolutionHours ? `${c.slaResolutionHours}h` : '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{c.devicesCount}</td>
                    <td className="px-4 py-3 text-center"><StatusChip status={effStatus} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openDetail(c)} title="Dettagli" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openEdit(c)} title="Modifica" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} title="Elimina" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={detailModal.open} onClose={closeDetail} title="Dettaglio Contratto" subtitle={detailModal.contract ? `${detailModal.contract.code} — ${detailModal.contract.client}` : ''} maxWidth="max-w-xl">
        {detailModal.contract && (() => {
          const c = detailModal.contract
          const effStatus = getEffectiveStatus(c)
          return (
            <div className="space-y-4">
              {effStatus === 'expiring' && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-300 rounded-lg">
                  <AlertTriangle size={18} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800 font-medium">Questo contratto scade entro 30 giorni. Contattare il cliente per il rinnovo.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Tipo</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: typeBadge(c.contractType).bg, color: typeBadge(c.contractType).color }}>
                    {c.contractType}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Valore annuale</p>
                  <p className="text-base font-bold text-gray-800">{c.value ? formatCurrency(c.value) : 'T&M'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Inizio</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(c.startDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Scadenza</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(c.endDate)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">SLA</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Risposta:</span> {c.slaResponseHours ? `${c.slaResponseHours} ore` : '-'}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Risoluzione:</span> {c.slaResolutionHours ? `${c.slaResolutionHours} ore` : '-'}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Categorie coperte</p>
                <div className="flex flex-wrap gap-1.5">
                  {(c.coveredCategories || []).map(cat => (
                    <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{cat}</span>
                  ))}
                  {(!c.coveredCategories || c.coveredCategories.length === 0) && <span className="text-sm text-gray-400">-</span>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Referente</p>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{c.contact || '-'}</span>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail size={14} className="text-gray-400" />
                    <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline">{c.email}</a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Dispositivi coperti:</span>
                  <span className="text-sm font-bold text-gray-800">{c.devicesCount}</span>
                </div>
                <StatusChip status={effStatus} />
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={formModal.open} onClose={closeFormModal} title={formModal.contract ? 'Modifica Contratto' : 'Nuovo Contratto'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
              <input value={form.code} onChange={e => updateField('code', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.contractType} onChange={e => updateField('contractType', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="Full Service">Full Service</option>
                <option value="Time & Material">Time & Material</option>
                <option value="Preventiva Only">Preventiva Only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <input value={form.client} onChange={e => updateField('client', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referente</label>
              <input value={form.contact} onChange={e => updateField('contact', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valore annuo</label>
              <input type="number" min={0} step={100} value={form.value} onChange={e => updateField('value', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
              <input type="date" value={form.startDate} onChange={e => updateField('startDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
              <input type="date" value={form.endDate} onChange={e => updateField('endDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLA Risposta (ore)</label>
              <input type="number" min={0} value={form.slaResponseHours} onChange={e => updateField('slaResponseHours', Number(e.target.value))} placeholder="es. 2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLA Risoluzione (ore)</label>
              <input type="number" min={0} value={form.slaResolutionHours} onChange={e => updateField('slaResolutionHours', Number(e.target.value))} placeholder="es. 8" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N. Dispositivi</label>
            <input type="number" min={0} value={form.devicesCount} onChange={e => updateField('devicesCount', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie coperte (separate da virgola)</label>
            <input value={(form.coveredCategories || []).join(', ')} onChange={e => updateField('coveredCategories', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="es. Terapeutica, Diagnostica" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={closeFormModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              {formModal.contract ? 'Salva modifiche' : 'Crea contratto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600">
          Sei sicuro di voler eliminare il contratto <strong>{deleteTarget?.code}</strong>? Questa azione non può essere annullata.
        </p>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
