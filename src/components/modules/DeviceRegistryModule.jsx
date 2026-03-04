import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import StatusChip from '../shared/StatusChip'
import HealthBar from '../shared/HealthBar'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import PriorityPill from '../shared/PriorityPill'
import {
  Database, Plus, List, GitBranch, Edit, Eye,
  ChevronRight, ChevronDown, X, Save
} from 'lucide-react'

const CATEGORIES = ['Diagnostica', 'Terapeutica', 'Monitoraggio', 'Laboratorio', 'Altro']
const STATUS_OPTIONS = [
  { value: 'operative', label: 'Operativo' },
  { value: 'standby', label: 'Standby' },
  { value: 'maintenance', label: 'In Manutenzione' },
  { value: 'decommissioned', label: 'Dismesso' },
]
const CLASS_MDR = ['I', 'IIa', 'IIb', 'III']

const EMPTY_FORM = {
  name: '', brand: '', model: '', serialNumber: '', inventoryCode: '',
  category: 'Diagnostica', classMDR: 'IIa', location: '', client: '',
  installDate: '', warrantyEnd: '', status: 'operative', parentId: '',
  notes: '', healthScore: 100, serviceHours: 0, mtbf: 0,
}

// ---------------------------------------------------------------------------
// DeviceTreeNode — recursive tree node
// ---------------------------------------------------------------------------
function DeviceTreeNode({ device, children, level = 0, onSelect }) {
  const [open, setOpen] = useState(true)
  const hasChildren = children && children.length > 0

  return (
    <div style={{ paddingLeft: level * 20 }}>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
        onClick={() => onSelect(device)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{device.name}</span>
        <span className="text-xs text-gray-400 font-mono">{device.serialNumber}</span>
        <div className="w-24"><HealthBar score={device.healthScore} height="h-1.5" /></div>
        <StatusChip status={device.status} />
      </div>
      {open && hasChildren && children.map(child => (
        <DeviceTreeNode key={child.node.id} device={child.node} children={child.children} level={level + 1} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Module
// ---------------------------------------------------------------------------
export default function DeviceRegistryModule() {
  const {
    devices, interventions, addDevice, updateDevice,
  } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [viewMode, setViewMode] = useState('table') // table | tree
  const [formOpen, setFormOpen] = useState(false)
  const [editDevice, setEditDevice] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [detailDevice, setDetailDevice] = useState(null)

  // Unique clients for filter dropdown
  const uniqueClients = useMemo(() => [...new Set(devices.map(d => d.client).filter(Boolean))].sort(), [devices])

  // --- Filtered devices ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter(d => {
      if (q && ![d.name, d.brand, d.model, d.serialNumber, d.inventoryCode, d.location, d.client]
        .some(f => f?.toLowerCase().includes(q))) return false
      if (filterCategory && d.category !== filterCategory) return false
      if (filterStatus && d.status !== filterStatus) return false
      if (filterClient && d.client !== filterClient) return false
      return true
    })
  }, [devices, search, filterCategory, filterStatus, filterClient])

  // --- Tree structure ---
  const tree = useMemo(() => {
    const map = {}
    filtered.forEach(d => { map[d.id] = { node: d, children: [] } })
    const roots = []
    filtered.forEach(d => {
      if (d.parentId && map[d.parentId]) {
        map[d.parentId].children.push(map[d.id])
      } else {
        roots.push(map[d.id])
      }
    })
    return roots
  }, [filtered])

  // --- Form handlers ---
  const openNewForm = () => {
    setEditDevice(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEditForm = (device) => {
    setEditDevice(device)
    setForm({
      name: device.name || '', brand: device.brand || '', model: device.model || '',
      serialNumber: device.serialNumber || '', inventoryCode: device.inventoryCode || '',
      category: device.category || 'Diagnostica', classMDR: device.classMDR || 'IIa',
      location: device.location || '', client: device.client || '',
      installDate: device.installDate ? device.installDate.slice(0, 10) : '',
      warrantyEnd: device.warrantyEnd ? device.warrantyEnd.slice(0, 10) : '',
      status: device.status || 'operative', parentId: device.parentId || '',
      notes: device.notes || '', healthScore: device.healthScore ?? 100,
      serviceHours: device.serviceHours ?? 0, mtbf: device.mtbf ?? 0,
    })
    setFormOpen(true)
  }

  const handleSave = () => {
    const payload = {
      ...form,
      installDate: form.installDate ? new Date(form.installDate).toISOString() : null,
      warrantyEnd: form.warrantyEnd ? new Date(form.warrantyEnd).toISOString() : null,
      parentId: form.parentId || null,
      healthScore: Number(form.healthScore),
      serviceHours: Number(form.serviceHours),
      mtbf: Number(form.mtbf),
    }
    if (editDevice) {
      updateDevice(editDevice.id, payload)
    } else {
      addDevice(payload)
    }
    setFormOpen(false)
  }

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // --- Detail panel data ---
  const deviceInterventions = useMemo(() => {
    if (!detailDevice) return []
    return interventions
      .filter(i => i.deviceId === detailDevice.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [detailDevice, interventions])

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <SectionHeader title="Anagrafica Dispositivi" subtitle="Registro master dispositivi medici — MDR 2017/745">
        <button onClick={openNewForm} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Nuovo Dispositivo
        </button>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><List size={16} /></button>
          <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded ${viewMode === 'tree' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><GitBranch size={16} /></button>
        </div>
      </SectionHeader>

      {/* Search + Filters */}
      <SearchBar value={search} onChange={setSearch} placeholder="Cerca nome, marca, modello, seriale, codice inventario, ubicazione, cliente..." className="w-full" />

      <div className="flex flex-wrap items-center gap-3">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tutte le Categorie</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tutti gli Stati</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tutti i Clienti</option>
          {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} dispositivi</span>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        filtered.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Codice Inv.</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Brand / Modello</th>
                  <th className="px-4 py-3">S/N</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Classe MDR</th>
                  <th className="px-4 py-3">Ubicazione</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 w-28">Health</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                    onClick={() => setDetailDevice(d)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.inventoryCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.brand} {d.model}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.serialNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{d.category}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">{d.classMDR}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{d.location}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.client}</td>
                    <td className="px-4 py-3"><HealthBar score={d.healthScore} height="h-1.5" /></td>
                    <td className="px-4 py-3"><StatusChip status={d.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailDevice(d) }}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Dettaglio"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Database} message="Nessun dispositivo trovato" description="Prova a modificare i filtri di ricerca" />
        )
      )}

      {/* Tree View */}
      {viewMode === 'tree' && (
        tree.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-1">
            {tree.map(item => (
              <DeviceTreeNode key={item.node.id} device={item.node} children={item.children} onSelect={setDetailDevice} />
            ))}
          </div>
        ) : (
          <EmptyState icon={GitBranch} message="Nessun dispositivo trovato" description="Prova a modificare i filtri di ricerca" />
        )
      )}

      {/* ================================================================= */}
      {/* DeviceFormModal                                                     */}
      {/* ================================================================= */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editDevice ? 'Modifica Dispositivo' : 'Nuovo Dispositivo'} subtitle="Compila tutti i campi obbligatori" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
            <input value={form.brand} onChange={e => setField('brand', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Modello</label>
            <input value={form.model} onChange={e => setField('model', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number *</label>
            <input value={form.serialNumber} onChange={e => setField('serialNumber', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Codice Inventario</label>
            <input value={form.inventoryCode} onChange={e => setField('inventoryCode', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <select value={form.category} onChange={e => setField('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Classe MDR</label>
            <select value={form.classMDR} onChange={e => setField('classMDR', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
              {CLASS_MDR.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ubicazione</label>
            <input value={form.location} onChange={e => setField('location', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <input value={form.client} onChange={e => setField('client', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Installazione</label>
            <input type="date" value={form.installDate} onChange={e => setField('installDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fine Garanzia</label>
            <input type="date" value={form.warrantyEnd} onChange={e => setField('warrantyEnd', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dispositivo Padre (opzionale)</label>
            <select value={form.parentId} onChange={e => setField('parentId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Nessuno (root)</option>
              {devices.filter(d => d.id !== editDevice?.id).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.serialNumber})</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
          <button onClick={handleSave} disabled={!form.name || !form.serialNumber} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={14} /> {editDevice ? 'Aggiorna' : 'Salva'}
          </button>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* DeviceDetailPanel                                                   */}
      {/* ================================================================= */}
      <Modal isOpen={!!detailDevice} onClose={() => setDetailDevice(null)} title={detailDevice?.name} subtitle={`${detailDevice?.brand} ${detailDevice?.model}`} maxWidth="max-w-2xl">
        {detailDevice && (
          <div className="space-y-5">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusChip status={detailDevice.status} />
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">Classe {detailDevice.classMDR}</span>
              </div>
              <button onClick={() => { setDetailDevice(null); openEditForm(detailDevice) }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Edit size={13} /> Modifica
              </button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-400 text-xs">Serial Number</span><p className="font-mono font-medium text-gray-800">{detailDevice.serialNumber}</p></div>
              <div><span className="text-gray-400 text-xs">Codice Inventario</span><p className="font-mono font-medium text-gray-800">{detailDevice.inventoryCode}</p></div>
              <div><span className="text-gray-400 text-xs">Categoria</span><p className="text-gray-700">{detailDevice.category}</p></div>
              <div><span className="text-gray-400 text-xs">Ubicazione</span><p className="text-gray-700">{detailDevice.location}</p></div>
              <div><span className="text-gray-400 text-xs">Cliente</span><p className="text-gray-700">{detailDevice.client}</p></div>
              <div><span className="text-gray-400 text-xs">Data Installazione</span><p className="text-gray-700">{detailDevice.installDate ? new Date(detailDevice.installDate).toLocaleDateString('it-IT') : '-'}</p></div>
              <div><span className="text-gray-400 text-xs">Fine Garanzia</span><p className="text-gray-700">{detailDevice.warrantyEnd ? new Date(detailDevice.warrantyEnd).toLocaleDateString('it-IT') : '-'}</p></div>
              <div><span className="text-gray-400 text-xs">Ore Servizio</span><p className="text-gray-700">{detailDevice.serviceHours?.toLocaleString('it-IT') ?? '-'} h</p></div>
            </div>

            {/* Health */}
            <div>
              <span className="text-xs text-gray-400">Health Score</span>
              <div className="mt-1"><HealthBar score={detailDevice.healthScore} height="h-2.5" /></div>
            </div>

            {/* Notes */}
            {detailDevice.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs font-medium text-gray-500 block mb-1">Note</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailDevice.notes}</p>
              </div>
            )}

            {/* Intervention history */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Storico Interventi ({deviceInterventions.length})</h3>
              {deviceInterventions.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {deviceInterventions.map(intv => (
                    <div key={intv.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-800">{intv.code}</span>
                          <PriorityPill priority={intv.priority} />
                          <StatusChip status={intv.status} />
                        </div>
                        <p className="text-gray-500 truncate">{intv.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gray-500">{new Date(intv.createdAt).toLocaleDateString('it-IT')}</p>
                        {intv.healthPre != null && (
                          <p className="font-medium">
                            <span className="text-red-500">{intv.healthPre}%</span>
                            {intv.healthPost != null && <> → <span className="text-green-600">{intv.healthPost}%</span></>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nessun intervento registrato per questo dispositivo.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
