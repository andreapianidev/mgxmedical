import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import StatusChip from '../shared/StatusChip'
import { Package, Plus, Edit, AlertTriangle, AlertCircle, DollarSign, Minus, RotateCcw, Info, Trash2 } from 'lucide-react'

const CATEGORIES = ['Tutti', 'Batterie', 'Guarnizioni', 'Filtri', 'Kit', 'Elettronica', 'Meccanica']
const STATUS_TABS = ['Tutti', 'Disponibile', 'Scorta Bassa', 'Esaurito']

const emptyItem = {
  code: '', name: '', category: 'Batterie', qty: 0, minQty: 1,
  unitCost: 0, supplier: '', leadTimeDays: 7, location: '', compatible: [],
}

export default function WarehouseModuleV2() {
  const { warehouse, addWarehouseItem, updateWarehouseItem, deleteWarehouseItem, logActivity } = useGlobalStore()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Tutti')
  const [statusTab, setStatusTab] = useState('Tutti')

  const [itemModal, setItemModal] = useState({ open: false, item: null })
  const [form, setForm] = useState(emptyItem)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [adjModal, setAdjModal] = useState({ open: false, item: null })
  const [adjQty, setAdjQty] = useState(0)
  const [adjNote, setAdjNote] = useState('')

  // --- helpers ---
  const getStatus = (w) => {
    if (w.qty === 0) return 'esaurito'
    if (w.qty > 0 && w.qty <= w.minQty) return 'scorta-bassa'
    return 'disponibile'
  }

  // --- KPIs ---
  const kpis = useMemo(() => {
    const esauriti = warehouse.filter(w => w.qty === 0).length
    const scortaBassa = warehouse.filter(w => w.qty > 0 && w.qty <= w.minQty).length
    const valore = warehouse.reduce((s, w) => s + w.qty * w.unitCost, 0)
    return { totali: warehouse.length, esauriti, scortaBassa, valore }
  }, [warehouse])

  // --- filtering ---
  const filtered = useMemo(() => {
    let list = [...warehouse]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(w =>
        w.code?.toLowerCase().includes(q) ||
        w.name?.toLowerCase().includes(q) ||
        w.supplier?.toLowerCase().includes(q)
      )
    }
    if (catFilter !== 'Tutti') {
      list = list.filter(w => w.category === catFilter)
    }
    if (statusTab === 'Disponibile') list = list.filter(w => w.qty > w.minQty)
    else if (statusTab === 'Scorta Bassa') list = list.filter(w => w.qty > 0 && w.qty <= w.minQty)
    else if (statusTab === 'Esaurito') list = list.filter(w => w.qty === 0)
    return list
  }, [warehouse, search, catFilter, statusTab])

  // --- add/edit modal ---
  const openAdd = () => {
    setForm({ ...emptyItem })
    setItemModal({ open: true, item: null })
  }
  const openEdit = (item) => {
    setForm({ ...item, compatible: item.compatible || [] })
    setItemModal({ open: true, item })
  }
  const closeItemModal = () => setItemModal({ open: false, item: null })

  const handleSaveItem = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      addToast('error', 'Codice e nome sono obbligatori.')
      return
    }
    try {
      if (itemModal.item) {
        await updateWarehouseItem(itemModal.item.id, { ...form })
        addToast('success', `Articolo ${form.code} aggiornato.`)
      } else {
        await addWarehouseItem({ ...form })
        addToast('success', `Articolo ${form.code} aggiunto al magazzino.`)
      }
    } catch (err) {
      addToast('error', 'Errore durante il salvataggio dell\'articolo.')
      return
    }
    closeItemModal()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteWarehouseItem(deleteTarget.id)
      addToast('success', `Articolo ${deleteTarget.code} eliminato.`)
    } catch (err) {
      addToast('error', err.message || 'Errore durante l\'eliminazione.')
    }
    setDeleteTarget(null)
  }

  // --- adjustment modal ---
  const openAdj = (item) => {
    setAdjModal({ open: true, item })
    setAdjQty(item.qty)
    setAdjNote('')
  }
  const closeAdj = () => setAdjModal({ open: false, item: null })

  const handleSaveAdj = async () => {
    if (!adjNote.trim()) {
      addToast('error', 'La nota di rettifica è obbligatoria.')
      return
    }
    try {
      await updateWarehouseItem(adjModal.item.id, { qty: Number(adjQty) })
      await logActivity({
        userId: user?.id,
        userName: user?.name,
        action: 'warehouse.adjustment',
        entityType: 'warehouse',
        entityId: adjModal.item.id,
        details: {
          code: adjModal.item.code,
          prevQty: adjModal.item.qty,
          newQty: Number(adjQty),
          note: adjNote.trim(),
        },
      })
      addToast('success', `Quantità ${adjModal.item.code} rettificata: ${adjModal.item.qty} → ${adjQty}`)
    } catch (err) {
      addToast('error', 'Errore durante la rettifica della quantità.')
      return
    }
    closeAdj()
  }

  // --- badge ---
  const stockBadge = (w) => {
    const s = getStatus(w)
    if (s === 'esaurito') return { bg: '#FADBD8', color: '#C0392B', label: 'ESAURITO' }
    if (s === 'scorta-bassa') return { bg: '#FDEBD0', color: '#E67E22', label: 'SCORTA BASSA' }
    return { bg: '#D5F5E3', color: '#27AE60', label: 'OK' }
  }

  const qtyColor = (w) => {
    if (w.qty === 0) return '#C0392B'
    if (w.qty <= w.minQty) return '#E67E22'
    return '#27AE60'
  }

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      <SectionHeader title="Magazzino Ricambi" subtitle="Gestione scorte e ricambi — Scalatura automatica">
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Aggiungi articolo
        </button>
      </SectionHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Package} value={kpis.totali} label="Articoli Totali" color="#2E86C1" />
        <KpiCard icon={AlertTriangle} value={kpis.esauriti} label="Esauriti" color="#C0392B" />
        <KpiCard icon={AlertCircle} value={kpis.scortaBassa} label="Scorta Bassa" color="#E67E22" />
        <KpiCard icon={DollarSign} value={formatCurrency(kpis.valore)} label="Valore Magazzino" color="#27AE60" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca codice, nome, fornitore..." className="flex-1" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
        <EmptyState icon={Package} message="Nessun articolo trovato" description="Prova a cambiare i filtri o aggiungi un nuovo articolo." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Codice</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-center">Qta</th>
                <th className="px-4 py-3 text-center">Min</th>
                <th className="px-4 py-3 text-right">Costo Unit.</th>
                <th className="px-4 py-3">Fornitore</th>
                <th className="px-4 py-3 text-center">Lead Time</th>
                <th className="px-4 py-3">Posizione</th>
                <th className="px-4 py-3">Compatibile con</th>
                <th className="px-4 py-3 text-center">Stato</th>
                <th className="px-4 py-3 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const badge = stockBadge(w)
                return (
                  <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{w.code}</td>
                    <td className="px-4 py-3 text-gray-700">{w.name}</td>
                    <td className="px-4 py-3 text-gray-500">{w.category}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: qtyColor(w) }}>{w.qty}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{w.minQty}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(w.unitCost)}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[160px]">{w.supplier}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{w.leadTimeDays} gg</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.location}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{(w.compatible || []).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(w)} title="Modifica" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => openAdj(w)} title="Rettifica quantità" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-orange-600">
                          <RotateCcw size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(w)} title="Elimina" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-500">
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

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Deduzione automatica ricambi</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Alla chiusura di un intervento, i ricambi utilizzati vengono automaticamente scalati dal magazzino tramite la funzione closeIntervention().
            Non e necessario rettificare manualmente dopo ogni intervento.
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={itemModal.open} onClose={closeItemModal} title={itemModal.item ? 'Modifica Articolo' : 'Nuovo Articolo'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
              <input value={form.code} onChange={e => updateField('code', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.category} onChange={e => updateField('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                {CATEGORIES.filter(c => c !== 'Tutti').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={form.name} onChange={e => updateField('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantita</label>
              <input type="number" min={0} value={form.qty} onChange={e => updateField('qty', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qta Minima</label>
              <input type="number" min={0} value={form.minQty} onChange={e => updateField('minQty', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario</label>
              <input type="number" min={0} step={0.01} value={form.unitCost} onChange={e => updateField('unitCost', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
              <input value={form.supplier} onChange={e => updateField('supplier', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (gg)</label>
              <input type="number" min={0} value={form.leadTimeDays} onChange={e => updateField('leadTimeDays', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posizione</label>
              <input value={form.location} onChange={e => updateField('location', e.target.value)} placeholder="es. A1-01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compatibile con (S/N separati da virgola)</label>
              <input value={(form.compatible || []).join(', ')} onChange={e => updateField('compatible', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={closeItemModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
            <button onClick={handleSaveItem} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              {itemModal.item ? 'Salva modifiche' : 'Aggiungi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjustment Modal */}
      <Modal isOpen={adjModal.open} onClose={closeAdj} title="Rettifica Quantita" subtitle={adjModal.item ? `${adjModal.item.code} — ${adjModal.item.name}` : ''}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Quantita attuale</span>
            <span className="text-lg font-bold text-gray-800">{adjModal.item?.qty}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova quantità</label>
            <input type="number" min={0} value={adjQty} onChange={e => setAdjQty(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivazione rettifica *</label>
            <textarea value={adjNote} onChange={e => setAdjNote(e.target.value)} rows={3} placeholder="Indicare la motivazione della rettifica..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={closeAdj} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
            <button onClick={handleSaveAdj} className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">Conferma rettifica</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600">
          Sei sicuro di voler eliminare l'articolo <strong>{deleteTarget?.code}</strong>? Questa azione non può essere annullata.
        </p>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
