import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency, formatDate, generateId } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import {
  FileText, Plus, Send, CheckCircle2,
  AlertTriangle, Mail, Eye, DollarSign, XCircle, Trash2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'draft', label: 'Bozze' },
  { key: 'sent', label: 'Inviate' },
  { key: 'accepted', label: 'Accettate' },
  { key: 'declined', label: 'Rifiutate' },
  { key: 'expired', label: 'Scadute' },
]

// ---------------------------------------------------------------------------
// Helper — compute effective status with auto-expiry
// ---------------------------------------------------------------------------
function getEffectiveStatus(offer) {
  if (offer.status === 'accepted') return 'accepted'
  if (offer.status === 'declined') return 'declined'
  if (offer.status === 'expired') return 'expired'
  // Auto-expire: offers past validUntil that aren't accepted/declined
  if (offer.validUntil && offer.status !== 'draft') {
    const until = new Date(offer.validUntil)
    if (until < new Date()) return 'expired'
  }
  return offer.status
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function OffersModuleV2() {
  const { offers, addOffer, updateOffer, acceptOffer, declineOffer, deleteOffer, interventions } = useGlobalStore()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [detailOffer, setDetailOffer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // New offer form
  const [newForm, setNewForm] = useState({
    client: '',
    amount: '',
    validUntil: '',
    description: '',
    notes: '',
    interventionId: '',
  })

  // ---------- Enrich offers with effective status ----------
  const enriched = useMemo(
    () => offers.map(o => ({ ...o, effectiveStatus: getEffectiveStatus(o) })),
    [offers]
  )

  // ---------- KPI calculations ----------
  const kpis = useMemo(() => {
    const inAttesa = enriched
      .filter(o => o.effectiveStatus === 'sent')
      .reduce((sum, o) => sum + (o.amount || 0), 0)

    const accettate = enriched
      .filter(o => o.effectiveStatus === 'accepted')
      .reduce((sum, o) => sum + (o.amount || 0), 0)

    const bozze = enriched.filter(o => o.effectiveStatus === 'draft').length

    const scadute = enriched.filter(o => o.effectiveStatus === 'expired' || o.effectiveStatus === 'declined').length

    return { inAttesa, accettate, bozze, scadute }
  }, [enriched])

  // ---------- Filtered list ----------
  const filtered = useMemo(() => {
    let list = enriched

    // Status tab
    if (statusTab !== 'all') {
      list = list.filter(o => o.effectiveStatus === statusTab)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        (o.number || '').toLowerCase().includes(q) ||
        (o.client || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [enriched, statusTab, search])

  // ---------- Unique clients for dropdown ----------
  const uniqueClients = useMemo(() => {
    const clients = [...new Set(offers.map(o => o.client).filter(Boolean))]
    return clients.sort()
  }, [offers])

  // ---------- Handlers: Send offer (mailto) ----------
  const handleSendOffer = (offer) => {
    const subject = encodeURIComponent(`Offerta ${offer.number} — MGX Medical Service`)
    const body = encodeURIComponent(
      `Gentile Cliente,\n\n` +
      `In allegato l'offerta n. ${offer.number}.\n\n` +
      `Dettagli:\n` +
      `- Cliente: ${offer.client}\n` +
      `- Descrizione: ${offer.description || '-'}\n` +
      `- Importo: ${formatCurrency(offer.amount)}\n` +
      `- IVA: ${offer.vatRate || 22}%\n` +
      `- Totale: ${formatCurrency((offer.amount || 0) * 1.22)}\n` +
      `- Validità: ${offer.validUntil ? formatDate(offer.validUntil) : 'Da definire'}\n` +
      `${offer.notes ? `\nNote: ${offer.notes}` : ''}\n\n` +
      `Restiamo a disposizione per qualsiasi chiarimento.\n\n` +
      `Cordiali saluti,\nMGX Medical Service`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')

    // Update status to 'sent' if it was draft
    if (offer.status === 'draft') {
      updateOffer(offer.id, { status: 'sent', createdAt: offer.createdAt || new Date().toISOString() })
    }
  }

  // ---------- Handlers: Accept offer ----------
  const handleAccept = (offer) => {
    acceptOffer(offer.id)
  }

  // ---------- Handlers: Decline offer ----------
  const handleDecline = (offer) => {
    declineOffer(offer.id)
  }

  // ---------- Handlers: Delete offer ----------
  const handleDeleteOffer = async () => {
    if (!deleteTarget) return
    try {
      await deleteOffer(deleteTarget.id)
      addToast('success', `Offerta ${deleteTarget.number} eliminata.`)
    } catch (err) {
      addToast('error', err.message || 'Errore durante l\'eliminazione.')
    }
    setDeleteTarget(null)
  }

  // ---------- Handlers: New offer ----------
  const openNewModal = () => {
    setNewForm({ client: '', amount: '', validUntil: '', description: '', notes: '', interventionId: '' })
    setShowNewModal(true)
  }

  const handleCreateOffer = () => {
    if (!newForm.client || !newForm.amount) {
      addToast('error', 'Cliente e importo sono obbligatori.')
      return
    }

    const number = `OFF-${new Date().getFullYear()}/${String(offers.length + 1).padStart(3, '0')}`
    addOffer({
      number,
      client: newForm.client,
      amount: parseFloat(newForm.amount),
      vatRate: 22,
      status: 'draft',
      createdAt: new Date().toISOString(),
      validUntil: newForm.validUntil || null,
      acceptedAt: null,
      interventionId: newForm.interventionId || null,
      description: newForm.description,
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
      <SectionHeader title="Offerte" subtitle="Gestione preventivi e offerte commerciali">
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nuova Offerta
        </button>
      </SectionHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Send} value={formatCurrency(kpis.inAttesa)} label="In Attesa" color="#2E86C1" />
        <KpiCard icon={CheckCircle2} value={formatCurrency(kpis.accettate)} label="Accettate" color="#27AE60" />
        <KpiCard icon={FileText} value={kpis.bozze} label="Bozze" color="#7F8C8D" />
        <KpiCard icon={AlertTriangle} value={kpis.scadute} label="Scadute / Rifiutate" color="#C0392B" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca per numero, cliente, descrizione..."
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

      {/* Offers Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Numero</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Descrizione</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Importo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Totale (IVA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Validità</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(offer => {
                  const total = (offer.amount || 0) * (1 + (offer.vatRate || 22) / 100)
                  const isExpired = offer.effectiveStatus === 'expired'
                  const isDeclined = offer.effectiveStatus === 'declined'
                  return (
                    <tr
                      key={offer.id}
                      className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors
                        ${isExpired || isDeclined ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{offer.number}</td>
                      <td className="px-4 py-3 text-gray-700">{offer.client}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{offer.description || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(offer.amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <span className={isExpired ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {offer.validUntil ? formatDate(offer.validUntil) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={offer.effectiveStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail button */}
                          <button
                            onClick={() => setDetailOffer(offer)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Dettagli"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Draft: Send button */}
                          {offer.effectiveStatus === 'draft' && (
                            <button
                              onClick={() => handleSendOffer(offer)}
                              className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Invia
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => setDeleteTarget(offer)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Elimina"
                          >
                            <Trash2 size={15} />
                          </button>

                          {/* Sent: Accept / Decline */}
                          {offer.effectiveStatus === 'sent' && (
                            <>
                              <button
                                onClick={() => handleAccept(offer)}
                                className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                Accetta
                              </button>
                              <button
                                onClick={() => handleDecline(offer)}
                                className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                Rifiuta
                              </button>
                            </>
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
        <EmptyState icon={FileText} message="Nessuna offerta trovata" description="Prova a modificare i filtri di ricerca." />
      )}

      {/* ================================================================== */}
      {/* NEW OFFER MODAL                                                    */}
      {/* ================================================================== */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nuova Offerta"
        subtitle="Crea un preventivo per riparazione o fornitura"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <input
              type="text"
              value={newForm.description}
              onChange={e => setNewForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Es. Riparazione ecografo, fornitura ricambi..."
            />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Valida fino al</label>
              <input
                type="date"
                value={newForm.validUntil}
                onChange={e => setNewForm(prev => ({ ...prev, validUntil: e.target.value }))}
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
              onClick={handleCreateOffer}
              disabled={!newForm.client || !newForm.amount}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={15} /> Crea Offerta
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* OFFER DETAIL MODAL                                                 */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!detailOffer}
        onClose={() => setDetailOffer(null)}
        title={`Offerta ${detailOffer?.number || ''}`}
        subtitle={detailOffer?.client}
        maxWidth="max-w-lg"
      >
        {detailOffer && (() => {
          const total = (detailOffer.amount || 0) * (1 + (detailOffer.vatRate || 22) / 100)
          const linkedIntervention = detailOffer.interventionId
            ? interventions.find(i => i.id === detailOffer.interventionId)
            : null

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusChip status={detailOffer.effectiveStatus || detailOffer.status} />
                {detailOffer.effectiveStatus === 'expired' && (
                  <span className="text-xs font-semibold text-red-600">SCADUTA</span>
                )}
                {detailOffer.effectiveStatus === 'declined' && (
                  <span className="text-xs font-semibold text-red-600">RIFIUTATA</span>
                )}
              </div>

              {detailOffer.description && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Descrizione</p>
                  <p className="text-sm text-gray-800">{detailOffer.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-400">Numero</p>
                  <p className="text-sm font-mono font-bold text-blue-700">{detailOffer.number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="text-sm font-medium text-gray-800">{detailOffer.client}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Imponibile</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(detailOffer.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">IVA ({detailOffer.vatRate || 22}%)</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency((detailOffer.amount || 0) * ((detailOffer.vatRate || 22) / 100))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Totale</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(total)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Data Creazione</p>
                  <p className="text-sm text-gray-700">{detailOffer.createdAt ? formatDate(detailOffer.createdAt) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Valida fino al</p>
                  <p className={`text-sm ${detailOffer.effectiveStatus === 'expired' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {detailOffer.validUntil ? formatDate(detailOffer.validUntil) : '-'}
                  </p>
                </div>
                {detailOffer.acceptedAt && (
                  <div>
                    <p className="text-xs text-gray-400">Accettata il</p>
                    <p className="text-sm text-green-600 font-medium">{formatDate(detailOffer.acceptedAt)}</p>
                  </div>
                )}
              </div>

              {linkedIntervention && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Intervento collegato</p>
                  <p className="text-sm text-gray-800">{linkedIntervention.code} — {linkedIntervention.deviceName}</p>
                </div>
              )}

              {detailOffer.notes && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Note</p>
                  <p className="text-sm text-gray-700">{detailOffer.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleSendOffer(detailOffer)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail size={16} /> Invia via Email
                </button>
                {detailOffer.effectiveStatus === 'sent' && (
                  <>
                    <button
                      onClick={() => { handleAccept(detailOffer); setDetailOffer(null) }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 size={16} /> Accetta
                    </button>
                    <button
                      onClick={() => { handleDecline(detailOffer); setDetailOffer(null) }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle size={16} /> Rifiuta
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600">
          Sei sicuro di voler eliminare l'offerta <strong>{deleteTarget?.number}</strong>? Questa azione non può essere annullata.
        </p>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annulla</button>
          <button onClick={handleDeleteOffer} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
