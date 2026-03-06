import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { DEMO_USERS } from '../../data/demoData'
import { differenceInDays, format } from 'date-fns'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import StatusChip from '../shared/StatusChip'
import KpiCard from '../shared/KpiCard'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import { Microscope, Wrench, User, Calendar, AlertTriangle, Plus, Eye, CheckCircle2, Trash2 } from 'lucide-react'

const STATUS_TABS = ['Tutti', 'Disponibile', 'In uso', 'Manutenzione']
const STATUS_MAP = { 'Disponibile': 'available', 'In uso': 'in-use', 'Manutenzione': 'maintenance' }

function calibrationAlert(calibrationDue) {
  if (!calibrationDue) return null
  const days = differenceInDays(new Date(calibrationDue), new Date())
  if (days < 0) return { color: '#C0392B', bg: '#FADBD8', label: `Scaduta (${Math.abs(days)}gg)` }
  if (days <= 30) return { color: '#E67E22', bg: '#FDEBD0', label: `${days}gg` }
  return null
}

export default function EquipmentModule() {
  const { equipment, updateEquipment, addEquipment, deleteEquipment, interventions } = useGlobalStore()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tutti')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [detailItem, setDetailItem] = useState(null)
  const [assignModal, setAssignModal] = useState({ open: false, item: null })
  const [assignTech, setAssignTech] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ code: '', name: '', category: '', calibrationDue: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const technicians = DEMO_USERS.filter(u => u.role === 'technician' || u.role === 'admin')
  const categories = useMemo(() => [...new Set(equipment.map(e => e.category))].sort(), [equipment])

  // Enrich with calibration data
  const enriched = useMemo(() =>
    equipment.map(e => {
      const techUser = e.assignedTo ? DEMO_USERS.find(u => u.id === e.assignedTo) : null
      const calAlert = calibrationAlert(e.calibrationDue)
      const calDays = e.calibrationDue ? differenceInDays(new Date(e.calibrationDue), new Date()) : null
      return { ...e, techName: techUser?.name || null, calAlert, calDays }
    }),
    [equipment]
  )

  // KPIs
  const kpis = useMemo(() => ({
    totale: enriched.length,
    disponibili: enriched.filter(e => e.status === 'available').length,
    inUso: enriched.filter(e => e.status === 'in-use').length,
    calibrazioni: enriched.filter(e => e.calAlert !== null).length,
  }), [enriched])

  // Filtered list
  const filtered = useMemo(() => {
    let list = enriched
    if (statusFilter !== 'Tutti') {
      const mapped = STATUS_MAP[statusFilter]
      if (mapped) list = list.filter(e => e.status === mapped)
    }
    if (categoryFilter) list = list.filter(e => e.category === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [enriched, statusFilter, categoryFilter, search])

  // Active interventions for assignment dropdown
  const activeInterventions = useMemo(() =>
    interventions.filter(i => i.status === 'in-progress' || i.status === 'acknowledged' || i.status === 'pending'),
    [interventions]
  )

  const handleAssign = () => {
    if (!assignModal.item || !assignTech) return
    updateEquipment(assignModal.item.id, {
      status: 'in-use',
      assignedTo: assignTech,
      lastUsed: new Date().toISOString(),
    })
    setAssignModal({ open: false, item: null })
    setAssignTech('')
    setAssignNote('')
  }

  const handleRelease = (item) => {
    updateEquipment(item.id, {
      status: 'available',
      assignedTo: null,
      lastUsed: new Date().toISOString(),
    })
    setDetailItem(null)
  }

  const handleAddEquipment = async () => {
    if (!addForm.code || !addForm.name) {
      addToast('error', 'Codice e nome sono obbligatori.')
      return
    }
    try {
      await addEquipment({
        code: addForm.code,
        name: addForm.name,
        category: addForm.category || 'Generico',
        status: 'available',
        calibrationDue: addForm.calibrationDue || null,
      })
      addToast('success', 'Strumento aggiunto con successo')
      setShowAddModal(false)
      setAddForm({ code: '', name: '', category: '', calibrationDue: '' })
    } catch {
      addToast('error', 'Errore nell\'aggiunta dello strumento')
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deleteTarget) return
    try {
      await deleteEquipment(deleteTarget.id)
      addToast('success', 'Strumento eliminato con successo')
    } catch {
      addToast('error', 'Errore nell\'eliminazione dello strumento')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Strumentazione" subtitle="Gestione attrezzature tecniche e calibrazioni">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Nuovo Strumento
        </button>
      </SectionHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Microscope} value={kpis.totale} label="Totale strumenti" color="#2E86C1" />
        <KpiCard icon={CheckCircle2} value={kpis.disponibili} label="Disponibili" color="#27AE60" onClick={() => setStatusFilter('Disponibile')} />
        <KpiCard icon={Wrench} value={kpis.inUso} label="In uso" color="#8E44AD" onClick={() => setStatusFilter('In uso')} />
        <KpiCard icon={AlertTriangle} value={kpis.calibrazioni} label="Calibrazioni in scadenza" color="#E67E22" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca strumento, codice..." className="flex-1" />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tutte le categorie</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Equipment Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Codice</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Categoria</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Stato</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Assegnato a</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Scad. Calibrazione</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Ultima Utilizzazione</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${e.calAlert ? 'bg-opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                    <td className="px-4 py-3 text-gray-500">{e.category}</td>
                    <td className="px-4 py-3 text-center"><StatusChip status={e.status} /></td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.techName ? (
                        <span className="flex items-center gap-1.5"><User size={13} className="text-gray-400" />{e.techName}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.calibrationDue ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{format(new Date(e.calibrationDue), 'dd/MM/yyyy')}</span>
                          {e.calAlert && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: e.calAlert.bg, color: e.calAlert.color }}>
                              {e.calAlert.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {e.lastUsed ? format(new Date(e.lastUsed), 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetailItem(e)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Dettagli">
                          <Eye size={15} className="text-gray-500" />
                        </button>
                        {e.status === 'available' && (
                          <button
                            onClick={() => { setAssignModal({ open: true, item: e }); setAssignTech(''); setAssignNote('') }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Assegna"
                          >
                            <Plus size={15} className="text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Elimina"
                        >
                          <Trash2 size={15} className="text-gray-400 hover:text-red-500" />
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
        <EmptyState icon={Microscope} message="Nessuna attrezzatura trovata" description="Prova a modificare i filtri di ricerca" />
      )}

      {/* Equipment Detail Modal */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Dettaglio Strumento"
        subtitle={detailItem ? detailItem.name : ''}
        maxWidth="max-w-xl"
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
              <div><p className="text-xs text-gray-400">Codice</p><p className="text-sm font-mono font-medium text-gray-800">{detailItem.code}</p></div>
              <div><p className="text-xs text-gray-400">Categoria</p><p className="text-sm font-medium text-gray-800">{detailItem.category}</p></div>
              <div><p className="text-xs text-gray-400">Stato</p><StatusChip status={detailItem.status} /></div>
              <div><p className="text-xs text-gray-400">Assegnato a</p><p className="text-sm font-medium text-gray-800">{detailItem.techName || 'Non assegnato'}</p></div>
              <div>
                <p className="text-xs text-gray-400">Scadenza Calibrazione</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{detailItem.calibrationDue ? format(new Date(detailItem.calibrationDue), 'dd/MM/yyyy') : 'N/A'}</p>
                  {detailItem.calAlert && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: detailItem.calAlert.bg, color: detailItem.calAlert.color }}>
                      {detailItem.calAlert.label}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Ultima Utilizzazione</p>
                <p className="text-sm font-medium text-gray-800">{detailItem.lastUsed ? format(new Date(detailItem.lastUsed), 'dd/MM/yyyy HH:mm') : '—'}</p>
              </div>
            </div>

            {/* Usage history placeholder */}
            <div className="border border-gray-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Calendar size={14} /> Storico Utilizzo</h4>
              <div className="space-y-2">
                {[
                  { date: '22/12/2024', tech: 'Marco Rossi', intervention: 'INT-2408' },
                  { date: '18/12/2024', tech: 'Marco Rossi', intervention: 'INT-2401' },
                  { date: '10/12/2024', tech: 'Marco Rossi', intervention: 'INT-2406' },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{h.date}</span>
                    <span className="text-xs text-gray-600">{h.tech}</span>
                    <span className="text-xs font-mono text-blue-600">{h.intervention}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {detailItem.status === 'in-use' && (
                <button
                  onClick={() => handleRelease(detailItem)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <CheckCircle2 size={16} /> Rilascia strumento
                </button>
              )}
              {detailItem.status === 'available' && (
                <button
                  onClick={() => { setDetailItem(null); setAssignModal({ open: true, item: detailItem }); setAssignTech(''); setAssignNote('') }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <User size={16} /> Assegna
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Equipment Modal */}
      <Modal
        isOpen={assignModal.open}
        onClose={() => { setAssignModal({ open: false, item: null }); setAssignTech(''); setAssignNote('') }}
        title="Assegna Strumento"
        subtitle={assignModal.item ? assignModal.item.name : ''}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">{assignModal.item?.code} — {assignModal.item?.name}</p>
            <p className="text-xs text-gray-500 mt-1">{assignModal.item?.category}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico *</label>
            <select
              value={assignTech}
              onChange={e => setAssignTech(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Seleziona tecnico...</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervento (opzionale)</label>
            <select
              value={assignNote}
              onChange={e => setAssignNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Nessun intervento collegato</option>
              {activeInterventions.map(i => <option key={i.id} value={i.code}>{i.code} — {i.deviceName}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => { setAssignModal({ open: false, item: null }); setAssignTech(''); setAssignNote('') }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAssign}
              disabled={!assignTech}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Conferma assegnazione
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Equipment Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddForm({ code: '', name: '', category: '', calibrationDue: '' }) }} title="Nuovo Strumento" subtitle="Aggiungi una nuova attrezzatura">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
            <input
              type="text"
              value={addForm.code}
              onChange={e => setAddForm(prev => ({ ...prev, code: e.target.value }))}
              placeholder="es. STR-001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={addForm.name}
              onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="es. Multimetro digitale"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input
              type="text"
              value={addForm.category}
              onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
              placeholder="es. Misura, Diagnostica..."
              list="equipment-categories"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <datalist id="equipment-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza Calibrazione</label>
            <input
              type="date"
              value={addForm.calibrationDue}
              onChange={e => setAddForm(prev => ({ ...prev, calibrationDue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => { setShowAddModal(false); setAddForm({ code: '', name: '', category: '', calibrationDue: '' }) }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Annulla
            </button>
            <button onClick={handleAddEquipment} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Aggiungi Strumento
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sei sicuro di voler eliminare lo strumento <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Annulla
            </button>
            <button onClick={handleDeleteEquipment} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              Elimina
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
