import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { differenceInDays, format } from 'date-fns'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import KpiCard from '../shared/KpiCard'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import StatusChip from '../shared/StatusChip'
import { Shield, ShieldAlert, AlertTriangle, Mail, MessageCircle, Send, Clock, CheckCircle2, Eye, X } from 'lucide-react'

const ALERT_LEVELS = {
  SCADUTA:  { label: 'Scaduta',  bg: '#7B241C', color: '#FADBD8', textColor: '#FADBD8' },
  CRITICA:  { label: 'Critica',  bg: '#C0392B', color: '#FADBD8', textColor: '#fff' },
  WARNING:  { label: 'Warning',  bg: '#E67E22', color: '#FDEBD0', textColor: '#fff' },
  VALIDA:   { label: 'Valida',   bg: '#27AE60', color: '#D5F5E3', textColor: '#fff' },
}

function getAlertLevel(daysLeft) {
  if (daysLeft < 0) return 'SCADUTA'
  if (daysLeft <= 30) return 'CRITICA'
  if (daysLeft <= 90) return 'WARNING'
  return 'VALIDA'
}

function daysColor(daysLeft) {
  if (daysLeft < 0) return '#7B241C'
  if (daysLeft <= 30) return '#C0392B'
  if (daysLeft <= 90) return '#E67E22'
  return '#27AE60'
}

export default function WarrantyModule() {
  const { devices } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('Tutte')
  const [filterClient, setFilterClient] = useState('')
  const [detailDevice, setDetailDevice] = useState(null)
  const [batchModal, setBatchModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState([])
  const [batchMessage, setBatchMessage] = useState('')

  const tabs = ['Tutte', 'Scadute', 'Critiche', 'Warning', 'Valide']
  const tabMap = { Tutte: 'Tutte', Scadute: 'SCADUTA', Critiche: 'CRITICA', Warning: 'WARNING', Valide: 'VALIDA' }

  const now = new Date()

  // Enrich devices with warranty info
  const warrantyData = useMemo(() =>
    devices
      .filter(d => d.warrantyEnd)
      .map(d => {
        const daysLeft = differenceInDays(new Date(d.warrantyEnd), now)
        return { ...d, daysLeft, alertLevel: getAlertLevel(daysLeft) }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [devices]
  )

  // Unique clients
  const clients = useMemo(() => [...new Set(warrantyData.map(d => d.client))].sort(), [warrantyData])

  // KPI counts
  const kpis = useMemo(() => ({
    scadute: warrantyData.filter(d => d.daysLeft < 0).length,
    critiche: warrantyData.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30).length,
    warning: warrantyData.filter(d => d.daysLeft > 30 && d.daysLeft <= 90).length,
    valide: warrantyData.filter(d => d.daysLeft > 90).length,
  }), [warrantyData])

  // Filter logic
  const filtered = useMemo(() => {
    let list = warrantyData
    if (filterLevel !== 'Tutte') {
      const level = tabMap[filterLevel] || filterLevel
      list = list.filter(d => d.alertLevel === level)
    }
    if (filterClient) list = list.filter(d => d.client === filterClient)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        d.serialNumber?.toLowerCase().includes(q) ||
        d.client?.toLowerCase().includes(q)
      )
    }
    return list
  }, [warrantyData, filterLevel, filterClient, search])

  // Critical devices for batch notification
  const criticalDevices = useMemo(() => warrantyData.filter(d => d.daysLeft <= 30), [warrantyData])

  // --- Actions ---
  const openRenewalEmail = (d) => {
    const subject = encodeURIComponent(`Rinnovo Garanzia - ${d.name} S/N ${d.serialNumber}`)
    const body = encodeURIComponent(
      `Gentile Cliente,\n\nLa garanzia del dispositivo seguente necessita di rinnovo:\n\n` +
      `Dispositivo: ${d.name}\nModello: ${d.brand} ${d.model}\nS/N: ${d.serialNumber}\n` +
      `Cliente: ${d.client}\nData installazione: ${format(new Date(d.installDate), 'dd/MM/yyyy')}\n` +
      `Scadenza garanzia: ${format(new Date(d.warrantyEnd), 'dd/MM/yyyy')}\n\n` +
      `Restiamo a disposizione per definire le condizioni di rinnovo.\n\nCordiali saluti,\nMGX Medical Service`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }

  const openWhatsApp = (d) => {
    const text = encodeURIComponent(
      `MGX Medical - Avviso Garanzia\n\n` +
      `Dispositivo: ${d.name}\nS/N: ${d.serialNumber}\nCliente: ${d.client}\n` +
      `Scadenza: ${format(new Date(d.warrantyEnd), 'dd/MM/yyyy')}\n` +
      `Stato: ${ALERT_LEVELS[d.alertLevel].label}\n\n` +
      `Contattaci per il rinnovo della garanzia.`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleBatchSendEmail = () => {
    const devicesList = selectedBatch.map(id => {
      const d = warrantyData.find(x => x.id === id)
      return d ? `- ${d.name} (S/N: ${d.serialNumber}) — ${ALERT_LEVELS[d.alertLevel].label}` : ''
    }).filter(Boolean).join('\n')
    const subject = encodeURIComponent(`Notifica Garanzie - ${selectedBatch.length} dispositivi`)
    const body = encodeURIComponent(
      `${batchMessage || 'Notifica automatica garanzie in scadenza.'}\n\nDispositivi interessati:\n${devicesList}\n\nCordiali saluti,\nMGX Medical Service`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
    setBatchModal(false)
    setSelectedBatch([])
    setBatchMessage('')
  }

  const handleBatchSendWhatsApp = () => {
    const devicesList = selectedBatch.map(id => {
      const d = warrantyData.find(x => x.id === id)
      return d ? `- ${d.name} (${d.serialNumber})` : ''
    }).filter(Boolean).join('\n')
    const text = encodeURIComponent(
      `${batchMessage || 'Notifica garanzie in scadenza'}\n\n${devicesList}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setBatchModal(false)
    setSelectedBatch([])
    setBatchMessage('')
  }

  const toggleBatchDevice = (id) => {
    setSelectedBatch(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Garanzie & Rinnovi" subtitle="Gestione garanzie e scadenze dispositivi medici">
        {criticalDevices.length > 0 && (
          <button
            onClick={() => { setBatchModal(true); setSelectedBatch(criticalDevices.map(d => d.id)) }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Send size={14} /> Notifica critici ({criticalDevices.length})
          </button>
        )}
      </SectionHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={ShieldAlert} value={kpis.scadute} label="Scadute" color="#7B241C" onClick={() => setFilterLevel('Scadute')} />
        <KpiCard icon={AlertTriangle} value={kpis.critiche} label="Critiche (≤30gg)" color="#C0392B" onClick={() => setFilterLevel('Critiche')} />
        <KpiCard icon={Clock} value={kpis.warning} label="Warning (≤90gg)" color="#E67E22" onClick={() => setFilterLevel('Warning')} />
        <KpiCard icon={CheckCircle2} value={kpis.valide} label="Valide" color="#27AE60" onClick={() => setFilterLevel('Valide')} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-100 p-1 shadow-sm overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setFilterLevel(t === 'Tutte' ? 'Tutte' : t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filterLevel === t
                  ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca dispositivo, S/N, cliente..." className="flex-1" />
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tutti i clienti</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Warranty Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Dispositivo</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">S/N</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Installazione</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Scadenza Garanzia</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">Giorni Rim.</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Livello</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => {
                  const level = ALERT_LEVELS[d.alertLevel]
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.brand} {d.model}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.serialNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{d.client}</td>
                      <td className="px-4 py-3 text-gray-500">{format(new Date(d.installDate), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-gray-500">{format(new Date(d.warrantyEnd), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-sm" style={{ color: daysColor(d.daysLeft) }}>
                          {d.daysLeft < 0 ? d.daysLeft : `+${d.daysLeft}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: level.bg, color: level.textColor }}
                        >
                          {level.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setDetailDevice(d)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Dettagli">
                            <Eye size={15} className="text-gray-500" />
                          </button>
                          <button onClick={() => openRenewalEmail(d)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Email rinnovo">
                            <Mail size={15} className="text-blue-600" />
                          </button>
                          <button onClick={() => openWhatsApp(d)} className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="WhatsApp">
                            <MessageCircle size={15} className="text-green-600" />
                          </button>
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
        <EmptyState icon={Shield} message="Nessun dispositivo trovato" description="Prova a modificare i filtri di ricerca" />
      )}

      {/* Warranty Detail Panel */}
      <Modal
        isOpen={!!detailDevice}
        onClose={() => setDetailDevice(null)}
        title="Dettaglio Garanzia"
        subtitle={detailDevice ? `${detailDevice.name} — ${detailDevice.serialNumber}` : ''}
        maxWidth="max-w-xl"
      >
        {detailDevice && (() => {
          const level = ALERT_LEVELS[detailDevice.alertLevel]
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: level.bg, color: level.textColor }}>
                  {level.label}
                </span>
                <span className="text-sm font-bold" style={{ color: daysColor(detailDevice.daysLeft) }}>
                  {detailDevice.daysLeft < 0 ? `${Math.abs(detailDevice.daysLeft)} giorni scaduta` : `${detailDevice.daysLeft} giorni rimanenti`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                <div><p className="text-xs text-gray-400">Marca / Modello</p><p className="text-sm font-medium text-gray-800">{detailDevice.brand} {detailDevice.model}</p></div>
                <div><p className="text-xs text-gray-400">S/N</p><p className="text-sm font-mono font-medium text-gray-800">{detailDevice.serialNumber}</p></div>
                <div><p className="text-xs text-gray-400">Cliente</p><p className="text-sm font-medium text-gray-800">{detailDevice.client}</p></div>
                <div><p className="text-xs text-gray-400">Ubicazione</p><p className="text-sm font-medium text-gray-800">{detailDevice.location}</p></div>
                <div><p className="text-xs text-gray-400">Data Installazione</p><p className="text-sm font-medium text-gray-800">{format(new Date(detailDevice.installDate), 'dd/MM/yyyy')}</p></div>
                <div><p className="text-xs text-gray-400">Scadenza Garanzia</p><p className="text-sm font-medium text-gray-800">{format(new Date(detailDevice.warrantyEnd), 'dd/MM/yyyy')}</p></div>
                <div><p className="text-xs text-gray-400">Categoria</p><p className="text-sm font-medium text-gray-800">{detailDevice.category}</p></div>
                <div><p className="text-xs text-gray-400">Stato Dispositivo</p><StatusChip status={detailDevice.status} /></div>
              </div>
              {detailDevice.notes && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">{detailDevice.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => openRenewalEmail(detailDevice)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail size={16} /> Email rinnovo
                </button>
                <button
                  onClick={() => openWhatsApp(detailDevice)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={16} /> WhatsApp
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Batch Notification Modal */}
      <Modal
        isOpen={batchModal}
        onClose={() => { setBatchModal(false); setSelectedBatch([]); setBatchMessage('') }}
        title="Notifica Batch Garanzie"
        subtitle={`${selectedBatch.length} dispositivi selezionati`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {criticalDevices.map(d => (
              <label key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBatch.includes(d.id)}
                  onChange={() => toggleBatchDevice(d.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.serialNumber} — {d.client}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: daysColor(d.daysLeft) }}>
                  {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}gg scaduta` : `+${d.daysLeft}gg`}
                </span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Messaggio</label>
            <textarea
              value={batchMessage}
              onChange={e => setBatchMessage(e.target.value)}
              rows={3}
              placeholder="Inserisci il messaggio da includere nella notifica..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => { setBatchModal(false); setSelectedBatch([]); setBatchMessage('') }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleBatchSendWhatsApp}
              disabled={selectedBatch.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={handleBatchSendEmail}
              disabled={selectedBatch.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Mail size={14} /> Invia Email
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
