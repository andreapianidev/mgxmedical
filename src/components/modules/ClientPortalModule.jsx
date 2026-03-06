import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { formatDate, formatCurrency } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import PriorityPill from '../shared/PriorityPill'
import HealthBar from '../shared/HealthBar'
import EmptyState from '../shared/EmptyState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, Users, FileText, BarChart3, Shield, Activity,
  Copy, ExternalLink, Download, CheckCircle2, Clock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Static SLA demo data (12 months)
// ---------------------------------------------------------------------------
const SLA_MONTHLY_DATA = [
  { month: 'Gen', compliance: 94 },
  { month: 'Feb', compliance: 97 },
  { month: 'Mar', compliance: 91 },
  { month: 'Apr', compliance: 99 },
  { month: 'Mag', compliance: 96 },
  { month: 'Giu', compliance: 88 },
  { month: 'Lug', compliance: 100 },
  { month: 'Ago', compliance: 93 },
  { month: 'Set', compliance: 98 },
  { month: 'Ott', compliance: 95 },
  { month: 'Nov', compliance: 92 },
  { month: 'Dic', compliance: 97 },
]

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'interventions', label: 'Interventi', icon: Activity },
  { key: 'devices', label: 'Dispositivi', icon: Shield },
  { key: 'sla', label: 'SLA Report', icon: CheckCircle2 },
  { key: 'documents', label: 'Documenti', icon: FileText },
]

export default function ClientPortalModule() {
  const { contracts, interventions, devices, schedMaint } = useGlobalStore()
  const { addToast } = useToast()

  const [selectedClient, setSelectedClient] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)

  // Derive unique client list from contracts
  const clientList = useMemo(() => {
    const clientMap = new Map()
    contracts.forEach(c => {
      if (!clientMap.has(c.client)) {
        clientMap.set(c.client, { name: c.client, contractType: c.contractType, devicesCount: c.devicesCount })
      }
    })
    return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [contracts])

  // Filtered data for selected client
  const clientInterventions = useMemo(
    () => selectedClient ? interventions.filter(i => i.structure === selectedClient) : [],
    [interventions, selectedClient],
  )
  const clientDevices = useMemo(
    () => selectedClient ? devices.filter(d => d.client === selectedClient) : [],
    [devices, selectedClient],
  )
  const clientMaint = useMemo(
    () => selectedClient ? schedMaint.filter(m => m.structure === selectedClient) : [],
    [schedMaint, selectedClient],
  )

  // KPIs for selected client
  const openInterventions = clientInterventions.filter(
    i => i.status !== 'completed',
  ).length
  const slaCompliance = clientInterventions.length > 0
    ? Math.round(
        (clientInterventions.filter(i => i.status === 'completed').length /
          clientInterventions.length) * 100,
      )
    : 100
  const avgHealth = clientDevices.length > 0
    ? Math.round(clientDevices.reduce((s, d) => s + (d.healthScore || 0), 0) / clientDevices.length)
    : 0
  const nextPM = clientMaint
    .filter(m => m.status === 'planned')
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0]

  // Client code for portal link
  const clientCode = selectedClient
    ? selectedClient.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`portal.mgx-medical.it/${clientCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Demo documents based on completed interventions
  const clientDocuments = clientInterventions
    .filter(i => i.status === 'completed')
    .map(i => ({
      id: i.id,
      title: `Rapporto Intervento ${i.code}`,
      date: i.closedAt,
      fileName: `rapporto_${i.code}.pdf`,
    }))

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Portale Cliente"
        subtitle="Gestione rapporti e portali clienti dedicati"
      />

      <div className="flex gap-6">
        {/* Left Sidebar — Client List */}
        <div className="w-1/4 min-w-[220px] bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 size={14} /> Clienti Contrattualizzati
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[calc(100vh-260px)] overflow-y-auto">
            {clientList.map(c => (
              <button
                key={c.name}
                onClick={() => { setSelectedClient(c.name); setActiveTab('overview') }}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selectedClient === c.name
                    ? 'bg-blue-50 border-l-3 border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-semibold truncate ${
                  selectedClient === c.name ? 'text-blue-700' : 'text-gray-800'
                }`}>
                  {c.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                    {c.contractType}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Users size={10} /> {c.devicesCount} dispositivi
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {!selectedClient ? (
            <EmptyState
              icon={Building2}
              message="Seleziona un cliente"
              description="Scegli un cliente dalla lista per visualizzare il portale dedicato"
            />
          ) : (
            <div className="space-y-4">
              {/* Portal Link */}
              <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3">
                <ExternalLink size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-gray-600">Portale:</span>
                <code className="text-sm font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  portal.mgx-medical.it/{clientCode}
                </code>
                <button
                  onClick={handleCopyLink}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-gray-100 hover:bg-gray-200 text-gray-600"
                >
                  {copied ? <><CheckCircle2 size={13} className="text-green-600" /> Copiato</> : <><Copy size={13} /> Copia</>}
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-white rounded-lg border border-gray-100 p-1 shadow-sm overflow-x-auto">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                      activeTab === t.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {/* --- Tab: Overview --- */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard icon={Activity} value={openInterventions} label="Interventi Aperti" color="#E74C3C" />
                  <KpiCard icon={CheckCircle2} value={`${slaCompliance}%`} label="SLA Compliance" color="#27AE60" />
                  <KpiCard icon={Shield} value={`${avgHealth}%`} label="Uptime Medio" color="#2E86C1" />
                  <KpiCard icon={Clock} value={nextPM ? formatDate(nextPM.scheduledDate) : 'N/D'} label="Prossima PM" color="#8E44AD" />
                </div>
              )}

              {/* --- Tab: Interventions --- */}
              {activeTab === 'interventions' && (
                clientInterventions.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-3 font-semibold text-gray-600">Codice</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Dispositivo</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-center">Priorita</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-center">Stato</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Tecnico</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {clientInterventions.map(i => (
                            <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-gray-800">{i.code}</td>
                              <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{i.deviceName}</td>
                              <td className="px-4 py-3 text-center"><PriorityPill priority={i.priority} /></td>
                              <td className="px-4 py-3 text-center"><StatusChip status={i.status} /></td>
                              <td className="px-4 py-3 text-gray-600">{i.techName}</td>
                              <td className="px-4 py-3 text-gray-500">{formatDate(i.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Activity} message="Nessun intervento" description="Non ci sono interventi registrati per questo cliente" />
                )
              )}

              {/* --- Tab: Devices --- */}
              {activeTab === 'devices' && (
                clientDevices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientDevices.map(d => (
                      <div key={d.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                            <p className="text-xs text-gray-400">{d.brand} {d.model}</p>
                          </div>
                          <StatusChip status={d.status} />
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-mono">S/N: {d.serialNumber}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Health Score</p>
                          <HealthBar score={d.healthScore} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Shield} message="Nessun dispositivo" description="Non ci sono dispositivi associati a questo cliente" />
                )
              )}

              {/* --- Tab: SLA Report --- */}
              {activeTab === 'sla' && (
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Compliance SLA Mensile — {selectedClient}
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SLA_MONTHLY_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                          formatter={(value) => [`${value}%`, 'Compliance']}
                        />
                        <Bar
                          dataKey="compliance"
                          fill="#2E86C1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* --- Tab: Documents --- */}
              {activeTab === 'documents' && (
                clientDocuments.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {clientDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-red-50 rounded-lg shrink-0">
                          <FileText size={18} className="text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-400">{formatDate(doc.date)} &mdash; {doc.fileName}</p>
                        </div>
                        <button
                          onClick={() => addToast('info', `Download ${doc.fileName} — funzionalità in arrivo`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >
                          <Download size={13} /> Scarica
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={FileText} message="Nessun documento" description="Non ci sono rapporti disponibili per questo cliente" />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
