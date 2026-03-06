import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { formatDate } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import { Settings, CheckCircle2, Clock, AlertTriangle, Calendar, Wrench, Plus, Edit, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'planned', label: 'Pianificate' },
  { key: 'in-progress', label: 'In Esecuzione' },
  { key: 'completed', label: 'Completate' },
  { key: 'overdue', label: 'Scadute' },
]

const MDR_FREQUENCIES = [
  { classMDR: 'I', frequency: 'Annuale', description: 'Dispositivi classe I — manutenzione annuale' },
  { classMDR: 'IIa', frequency: 'Semestrale', description: 'Dispositivi classe IIa — manutenzione semestrale' },
  { classMDR: 'IIb', frequency: 'Semestrale', description: 'Dispositivi classe IIb — manutenzione semestrale' },
  { classMDR: 'III', frequency: 'Trimestrale', description: 'Dispositivi classe III — manutenzione trimestrale' },
]

// ---------------------------------------------------------------------------
// Helper — compute effective status with auto-overdue
// ---------------------------------------------------------------------------
function getEffectiveStatus(item) {
  if (item.status === 'completed') return 'completed'
  if (item.status === 'in-progress') return 'in-progress'
  if (item.status === 'overdue') return 'overdue'
  // Auto-overdue: planned items past their scheduledDate
  if (item.status === 'planned' && item.scheduledDate) {
    const scheduled = new Date(item.scheduledDate)
    if (scheduled < new Date()) return 'overdue'
  }
  return item.status
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function MaintenanceModuleV2() {
  const { schedMaint, addMaintenance, updateMaintenance, completeMaintenance, deleteMaintenance, devices } = useGlobalStore()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [completeModal, setCompleteModal] = useState(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [formModal, setFormModal] = useState({ open: false, item: null })
  const [form, setForm] = useState({ deviceName: '', structure: '', techName: '', scheduledDate: '', frequency: 'Semestrale', notes: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ---------- Enrich items with effective status ----------
  const enriched = useMemo(
    () => schedMaint.map(item => ({ ...item, effectiveStatus: getEffectiveStatus(item) })),
    [schedMaint]
  )

  // ---------- KPI counts ----------
  const kpis = useMemo(() => ({
    planned: enriched.filter(i => i.effectiveStatus === 'planned').length,
    inProgress: enriched.filter(i => i.effectiveStatus === 'in-progress').length,
    completed: enriched.filter(i => i.effectiveStatus === 'completed').length,
    overdue: enriched.filter(i => i.effectiveStatus === 'overdue').length,
  }), [enriched])

  // ---------- Filtered list ----------
  const filtered = useMemo(() => {
    let list = enriched

    // Status tab
    if (statusTab !== 'all') {
      list = list.filter(i => i.effectiveStatus === statusTab)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        (i.deviceName || '').toLowerCase().includes(q) ||
        (i.structure || '').toLowerCase().includes(q) ||
        (i.techName || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [enriched, statusTab, search])

  // ---------- Handlers ----------
  const openCompleteModal = (item) => {
    setCompleteNotes(item.notes || '')
    setCompleteModal(item)
  }

  const handleComplete = () => {
    if (!completeModal) return
    completeMaintenance(completeModal.id, completeNotes)
    setCompleteModal(null)
    setCompleteNotes('')
  }

  const openAddForm = () => {
    setForm({ deviceName: '', structure: '', techName: '', scheduledDate: '', frequency: 'Semestrale', notes: '' })
    setFormModal({ open: true, item: null })
  }

  const openEditForm = (item) => {
    setForm({
      deviceName: item.deviceName || '', structure: item.structure || '',
      techName: item.techName || '',
      scheduledDate: item.scheduledDate ? item.scheduledDate.slice(0, 10) : '',
      frequency: item.frequency || 'Semestrale', notes: item.notes || '',
    })
    setFormModal({ open: true, item })
  }

  const handleSaveForm = async () => {
    if (!form.deviceName.trim() || !form.scheduledDate) {
      addToast('error', 'Dispositivo e data pianificata sono obbligatori.')
      return
    }
    try {
      if (formModal.item) {
        await updateMaintenance(formModal.item.id, form)
        addToast('success', 'Manutenzione aggiornata.')
      } else {
        await addMaintenance({ ...form, status: 'planned' })
        addToast('success', 'Manutenzione pianificata.')
      }
    } catch (err) {
      addToast('error', err.message || 'Errore durante il salvataggio.')
    }
    setFormModal({ open: false, item: null })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMaintenance(deleteTarget.id)
      addToast('success', 'Manutenzione eliminata.')
    } catch (err) {
      addToast('error', err.message || 'Errore durante l\'eliminazione.')
    }
    setDeleteTarget(null)
  }

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Manutenzione Preventiva" subtitle="Pianificazione PM — Frequenze per classe MDR">
        <button onClick={openAddForm} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Nuova PM
        </button>
      </SectionHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Calendar} value={kpis.planned} label="Pianificate" color="#2E86C1" onClick={() => setStatusTab('planned')} />
        <KpiCard icon={Clock} value={kpis.inProgress} label="In Esecuzione" color="#E67E22" onClick={() => setStatusTab('in-progress')} />
        <KpiCard icon={CheckCircle2} value={kpis.completed} label="Completate" color="#27AE60" onClick={() => setStatusTab('completed')} />
        <KpiCard icon={AlertTriangle} value={kpis.overdue} label="Scadute" color="#C0392B" onClick={() => setStatusTab('overdue')} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca dispositivo, struttura, tecnico..."
          className="flex-1 max-w-md"
        />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                ${statusTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PM Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Dispositivo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Struttura</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tecnico</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Data Pianificata</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Frequenza</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors
                      ${item.effectiveStatus === 'overdue' ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.deviceName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.structure}</td>
                    <td className="px-4 py-3 text-gray-600">{item.techName}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(item.scheduledDate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {item.frequency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={item.effectiveStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(item.effectiveStatus === 'planned' || item.effectiveStatus === 'in-progress' || item.effectiveStatus === 'overdue') && (
                          <>
                            <button
                              onClick={() => openCompleteModal(item)}
                              className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Completa PM
                            </button>
                            <button onClick={() => openEditForm(item)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600" title="Modifica">
                              <Edit size={15} />
                            </button>
                          </>
                        )}
                        {item.effectiveStatus === 'completed' && (
                          <span className="text-xs text-gray-400">
                            {item.completedAt ? formatDate(item.completedAt) : 'Completata'}
                          </span>
                        )}
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-500" title="Elimina">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Wrench} message="Nessuna manutenzione trovata" description="Prova a modificare i filtri di ricerca." />
      )}

      {/* Frequency info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={18} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">Frequenze Raccomandate per Classe MDR</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MDR_FREQUENCIES.map(f => (
            <div key={f.classMDR} className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-800">Classe {f.classMDR}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {f.frequency}
                </span>
              </div>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Complete PM Modal */}
      <Modal
        isOpen={!!completeModal}
        onClose={() => { setCompleteModal(null); setCompleteNotes('') }}
        title="Completa Manutenzione Preventiva"
        subtitle={completeModal ? `${completeModal.deviceName} — ${completeModal.structure}` : ''}
        maxWidth="max-w-lg"
      >
        {completeModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Dispositivo:</span>
                <span className="font-medium text-gray-800">{completeModal.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frequenza:</span>
                <span className="text-gray-700">{completeModal.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data pianificata:</span>
                <span className="text-gray-700">{formatDate(completeModal.scheduledDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tecnico:</span>
                <span className="text-gray-700">{completeModal.techName}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note di completamento</label>
              <textarea
                rows={4}
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                placeholder="Descrivi le attivita eseguite durante la manutenzione..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setCompleteModal(null); setCompleteNotes('') }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={15} /> Conferma Completamento
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit PM Modal */}
      <Modal isOpen={formModal.open} onClose={() => setFormModal({ open: false, item: null })} title={formModal.item ? 'Modifica Manutenzione' : 'Nuova Manutenzione Preventiva'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dispositivo *</label>
            <input value={form.deviceName} onChange={e => updateField('deviceName', e.target.value)} list="device-list" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nome dispositivo" />
            <datalist id="device-list">
              {devices.map(d => <option key={d.id} value={d.name} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Struttura</label>
              <input value={form.structure} onChange={e => updateField('structure', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico</label>
              <input value={form.techName} onChange={e => updateField('techName', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data pianificata *</label>
              <input type="date" value={form.scheduledDate} onChange={e => updateField('scheduledDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequenza</label>
              <select value={form.frequency} onChange={e => updateField('frequency', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="Trimestrale">Trimestrale</option>
                <option value="Semestrale">Semestrale</option>
                <option value="Annuale">Annuale</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setFormModal({ open: false, item: null })} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
            <button onClick={handleSaveForm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              {formModal.item ? 'Salva modifiche' : 'Pianifica PM'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600">
          Sei sicuro di voler eliminare la manutenzione per <strong>{deleteTarget?.deviceName}</strong>? Questa azione non può essere annullata.
        </p>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
