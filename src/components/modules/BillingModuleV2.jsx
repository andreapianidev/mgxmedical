import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { formatCurrency, formatDate } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import {
  Receipt, Plus, Send, CheckCircle2, FileText,
  AlertTriangle, Mail, Eye, DollarSign,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'draft', label: 'Bozze' },
  { key: 'sent', label: 'Inviate' },
  { key: 'issued', label: 'Emesse' },
  { key: 'paid', label: 'Pagate' },
  { key: 'overdue', label: 'Scadute' },
]

// ---------------------------------------------------------------------------
// Helper — compute effective status with auto-overdue
// ---------------------------------------------------------------------------
function getEffectiveStatus(inv) {
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'overdue') return 'overdue'
  // Auto-overdue: unpaid invoices past dueDate
  if (inv.dueDate && inv.status !== 'draft') {
    const due = new Date(inv.dueDate)
    if (due < new Date()) return 'overdue'
  }
  return inv.status
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function BillingModuleV2() {
  const { invoices, addInvoice, updateInvoice, markInvoicePaid, interventions } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [detailInvoice, setDetailInvoice] = useState(null)

  // New invoice form
  const [newForm, setNewForm] = useState({
    client: '',
    amount: '',
    dueDate: '',
    notes: '',
    interventionId: '',
  })

  // ---------- Enrich invoices with effective status ----------
  const enriched = useMemo(
    () => invoices.map(inv => ({ ...inv, effectiveStatus: getEffectiveStatus(inv) })),
    [invoices]
  )

  // ---------- KPI calculations ----------
  const kpis = useMemo(() => {
    const inSospeso = enriched
      .filter(inv => inv.effectiveStatus === 'sent' || inv.effectiveStatus === 'issued')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    const incassato = enriched
      .filter(inv => inv.effectiveStatus === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    const bozze = enriched.filter(inv => inv.effectiveStatus === 'draft').length

    const scadute = enriched.filter(inv => inv.effectiveStatus === 'overdue').length

    return { inSospeso, incassato, bozze, scadute }
  }, [enriched])

  // ---------- Filtered list ----------
  const filtered = useMemo(() => {
    let list = enriched

    // Status tab
    if (statusTab !== 'all') {
      list = list.filter(inv => inv.effectiveStatus === statusTab)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(inv =>
        (inv.number || '').toLowerCase().includes(q) ||
        (inv.client || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [enriched, statusTab, search])

  // ---------- Unique clients for dropdown ----------
  const uniqueClients = useMemo(() => {
    const clients = [...new Set(invoices.map(inv => inv.client).filter(Boolean))]
    return clients.sort()
  }, [invoices])

  // ---------- Handlers: Send invoice (mailto) ----------
  const handleSendInvoice = (inv) => {
    const subject = encodeURIComponent(`Fattura ${inv.number} — MGX Medical Service`)
    const body = encodeURIComponent(
      `Gentile Cliente,\n\n` +
      `In allegato la fattura n. ${inv.number}.\n\n` +
      `Dettagli:\n` +
      `- Cliente: ${inv.client}\n` +
      `- Importo: ${formatCurrency(inv.amount)}\n` +
      `- IVA: ${inv.vatRate || 22}%\n` +
      `- Totale: ${formatCurrency((inv.amount || 0) * 1.22)}\n` +
      `- Scadenza: ${inv.dueDate ? formatDate(inv.dueDate) : 'Da definire'}\n` +
      `${inv.notes ? `\nNote: ${inv.notes}` : ''}\n\n` +
      `Cordiali saluti,\nMGX Medical Service`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')

    // Update status to 'sent' if it was draft
    if (inv.status === 'draft') {
      updateInvoice(inv.id, { status: 'sent', issueDate: new Date().toISOString() })
    }
  }

  // ---------- Handlers: Mark as paid ----------
  const handleMarkPaid = (inv) => {
    markInvoicePaid(inv.id)
  }

  // ---------- Handlers: New invoice ----------
  const openNewModal = () => {
    setNewForm({ client: '', amount: '', dueDate: '', notes: '', interventionId: '' })
    setShowNewModal(true)
  }

  const handleCreateInvoice = () => {
    if (!newForm.client || !newForm.amount) return

    const number = `FT-${new Date().getFullYear()}/${String(invoices.length + 1).padStart(3, '0')}`
    addInvoice({
      number,
      client: newForm.client,
      amount: parseFloat(newForm.amount),
      vatRate: 22,
      status: 'draft',
      issueDate: null,
      dueDate: newForm.dueDate || null,
      paidAt: null,
      interventionId: newForm.interventionId || null,
      notes: newForm.notes,
    })
    setShowNewModal(false)
  }

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Fatturazione" subtitle="Gestione fatture e pagamenti">
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nuova Fattura
        </button>
      </SectionHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Receipt} value={formatCurrency(kpis.inSospeso)} label="In Sospeso" color="#2E86C1" />
        <KpiCard icon={CheckCircle2} value={formatCurrency(kpis.incassato)} label="Incassato" color="#27AE60" />
        <KpiCard icon={FileText} value={kpis.bozze} label="Bozze" color="#7F8C8D" />
        <KpiCard icon={AlertTriangle} value={kpis.scadute} label="Scadute" color="#C0392B" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca per numero fattura, cliente..."
          className="flex-1 max-w-md"
        />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
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

      {/* Invoices Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Numero</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Importo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">IVA</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Totale</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Data Emissione</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Scadenza</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const total = (inv.amount || 0) * (1 + (inv.vatRate || 22) / 100)
                  const isOverdue = inv.effectiveStatus === 'overdue'
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors
                        ${isOverdue ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{inv.number}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.client}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{inv.vatRate || 22}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(total)}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.issueDate ? formatDate(inv.issueDate) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={inv.effectiveStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail button */}
                          <button
                            onClick={() => setDetailInvoice(inv)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Dettagli"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Draft: Send button */}
                          {inv.effectiveStatus === 'draft' && (
                            <button
                              onClick={() => handleSendInvoice(inv)}
                              className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Invia
                            </button>
                          )}

                          {/* Sent/Issued: Mark paid */}
                          {(inv.effectiveStatus === 'sent' || inv.effectiveStatus === 'issued') && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Segna Pagata
                            </button>
                          )}

                          {/* Overdue: Mark paid */}
                          {inv.effectiveStatus === 'overdue' && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Segna Pagata
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Receipt} message="Nessuna fattura trovata" description="Prova a modificare i filtri di ricerca." />
      )}

      {/* ================================================================== */}
      {/* NEW INVOICE MODAL                                                  */}
      {/* ================================================================== */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nuova Fattura"
        subtitle="Crea una nuova fattura"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={newForm.client}
              onChange={e => setNewForm(prev => ({ ...prev, client: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Seleziona cliente...</option>
              {uniqueClients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (netto)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newForm.amount}
                onChange={e => setNewForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Scadenza</label>
              <input
                type="date"
                value={newForm.dueDate}
                onChange={e => setNewForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervento collegato (opzionale)</label>
            <select
              value={newForm.interventionId}
              onChange={e => setNewForm(prev => ({ ...prev, interventionId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Nessuno</option>
              {interventions.map(intv => (
                <option key={intv.id} value={intv.id}>
                  {intv.code} — {intv.deviceName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows={3}
              value={newForm.notes}
              onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              placeholder="Note aggiuntive..."
            />
          </div>

          {newForm.amount && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Imponibile:</span>
                <span className="text-gray-700">{formatCurrency(parseFloat(newForm.amount) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA (22%):</span>
                <span className="text-gray-700">{formatCurrency((parseFloat(newForm.amount) || 0) * 0.22)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-700">Totale:</span>
                <span className="text-blue-700">{formatCurrency((parseFloat(newForm.amount) || 0) * 1.22)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={!newForm.client || !newForm.amount}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={15} /> Crea Fattura
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* INVOICE DETAIL MODAL                                               */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        title={`Fattura ${detailInvoice?.number || ''}`}
        subtitle={detailInvoice?.client}
        maxWidth="max-w-lg"
      >
        {detailInvoice && (() => {
          const total = (detailInvoice.amount || 0) * (1 + (detailInvoice.vatRate || 22) / 100)
          const linkedIntervention = detailInvoice.interventionId
            ? interventions.find(i => i.id === detailInvoice.interventionId)
            : null

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusChip status={detailInvoice.effectiveStatus || detailInvoice.status} />
                {detailInvoice.effectiveStatus === 'overdue' && (
                  <span className="text-xs font-semibold text-red-600">SCADUTA</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-400">Numero</p>
                  <p className="text-sm font-mono font-bold text-blue-700">{detailInvoice.number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="text-sm font-medium text-gray-800">{detailInvoice.client}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Imponibile</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(detailInvoice.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">IVA ({detailInvoice.vatRate || 22}%)</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency((detailInvoice.amount || 0) * ((detailInvoice.vatRate || 22) / 100))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Totale</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(total)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Data Emissione</p>
                  <p className="text-sm text-gray-700">{detailInvoice.issueDate ? formatDate(detailInvoice.issueDate) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Scadenza</p>
                  <p className={`text-sm ${detailInvoice.effectiveStatus === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {detailInvoice.dueDate ? formatDate(detailInvoice.dueDate) : '-'}
                  </p>
                </div>
                {detailInvoice.paidAt && (
                  <div>
                    <p className="text-xs text-gray-400">Data Pagamento</p>
                    <p className="text-sm text-green-600 font-medium">{formatDate(detailInvoice.paidAt)}</p>
                  </div>
                )}
              </div>

              {linkedIntervention && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Intervento collegato</p>
                  <p className="text-sm text-gray-800">{linkedIntervention.code} — {linkedIntervention.deviceName}</p>
                </div>
              )}

              {detailInvoice.notes && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Note</p>
                  <p className="text-sm text-gray-700">{detailInvoice.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleSendInvoice(detailInvoice)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail size={16} /> Invia via Email
                </button>
                {detailInvoice.effectiveStatus !== 'paid' && detailInvoice.effectiveStatus !== 'draft' && (
                  <button
                    onClick={() => { handleMarkPaid(detailInvoice); setDetailInvoice(null) }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 size={16} /> Segna Pagata
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
