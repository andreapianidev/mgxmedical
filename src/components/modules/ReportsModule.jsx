import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import KpiCard from '../shared/KpiCard'
import EmptyState from '../shared/EmptyState'
import {
  BarChart3, Activity, CheckCircle2, AlertCircle, AlertTriangle,
  Clock, Shield, DollarSign, Package, Download, Star,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PERIOD_TABS = [
  { key: 'month', label: 'Mese' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Anno' },
]

const PIE_COLORS = ['#2E86C1', '#27AE60', '#E67E22', '#C0392B', '#8E44AD', '#F39C12']

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

// ---------------------------------------------------------------------------
// Helper — star rating renderer
// ---------------------------------------------------------------------------
function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
        />
      ))}
    </div>
  )
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function ReportsModule() {
  const { interventions, offers, warehouse, fleet } = useGlobalStore()
  const { addToast } = useToast()

  const [period, setPeriod] = useState('year')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // ---------- KPI calculations ----------
  const totalInterventions = interventions.length
  const risolti = interventions.filter(i => i.outcome === 'Risolto').length
  const parziali = interventions.filter(i => i.outcome === 'Parziale').length
  const escalation = interventions.filter(i => i.outcome === 'Escalation').length

  const risoltiPct = totalInterventions > 0 ? ((risolti / totalInterventions) * 100).toFixed(1) : '0.0'
  const parzialiPct = totalInterventions > 0 ? ((parziali / totalInterventions) * 100).toFixed(1) : '0.0'
  const escalationPct = totalInterventions > 0 ? ((escalation / totalInterventions) * 100).toFixed(1) : '0.0'

  const offerteAccettate = useMemo(
    () => offers.filter(o => o.status === 'accepted').reduce((sum, o) => sum + (o.amount || 0), 0),
    [offers]
  )

  // Calculate MTTR from completed interventions (hours between creation and close)
  const mttr = useMemo(() => {
    const completed = interventions.filter(i => i.status === 'completed' && i.createdAt && i.closedAt)
    if (completed.length === 0) return '0.0'
    const totalHours = completed.reduce((sum, i) => {
      const hours = (new Date(i.closedAt) - new Date(i.createdAt)) / (1000 * 60 * 60)
      return sum + hours
    }, 0)
    return (totalHours / completed.length).toFixed(1)
  }, [interventions])

  // SLA: percentage of completed interventions (resolved on time)
  const slaRate = useMemo(() => {
    if (interventions.length === 0) return '0.0'
    const completed = interventions.filter(i => i.status === 'completed').length
    return ((completed / interventions.length) * 100).toFixed(1)
  }, [interventions])

  // Calculate parts cost from warehouse value
  const partsCost = useMemo(() => {
    return warehouse.reduce((sum, w) => sum + ((w.unitCost || 0) * (w.qty || 0)), 0)
  }, [warehouse])

  // ---------- Performance per Cliente ----------
  const clientPerformance = useMemo(() => {
    const map = {}
    interventions.forEach(i => {
      const client = i.structure || 'N/A'
      if (!map[client]) map[client] = { client, count: 0, slaOk: 0, spend: 0, uptime: 95 }
      map[client].count += 1
      if (i.status === 'completed') map[client].slaOk += 1
    })

    // Add accepted offer spend per client
    offers.forEach(o => {
      const client = o.client || 'N/A'
      if (!map[client]) map[client] = { client, count: 0, slaOk: 0, spend: 0, uptime: 95 }
      if (o.status === 'accepted') map[client].spend += o.amount || 0
    })

    return Object.values(map).map(c => ({
      ...c,
      slaPct: c.count > 0 ? ((c.slaOk / c.count) * 100).toFixed(1) : '0.0',
      uptime: c.count > 0 ? ((c.slaOk / c.count) * 100).toFixed(1) : '100.0',
    }))
  }, [interventions, offers])

  // ---------- Ranking Tecnici ----------
  const techRanking = useMemo(() => {
    const map = {}
    interventions.forEach(i => {
      const name = i.techName || 'N/A'
      if (!map[name]) map[name] = { name, count: 0, resolved: 0, rating: 4, km: 0 }
      map[name].count += 1
      if (i.outcome === 'Risolto') map[name].resolved += 1
    })

    // Calculate per-tech MTTR and get km from fleet data
    return Object.values(map).map(t => {
      const techCompleted = interventions.filter(
        i => (i.techName === t.name) && i.status === 'completed' && i.createdAt && i.closedAt
      )
      const avgHours = techCompleted.length > 0
        ? (techCompleted.reduce((s, i) => s + (new Date(i.closedAt) - new Date(i.createdAt)) / (1000 * 60 * 60), 0) / techCompleted.length).toFixed(1)
        : '0.0'
      const resolutionPct = t.count > 0 ? ((t.resolved / t.count) * 100).toFixed(1) : '0.0'
      const rating = t.count > 0 ? Math.min(5, Math.max(1, Math.round((t.resolved / t.count) * 5))) : 3
      const techVehicle = fleet.find(v => v.techName === t.name)
      const km = techVehicle?.kmToday || 0
      return { ...t, resolutionPct, mttr: `${avgHours}h`, rating, km }
    })
  }, [interventions, fleet])

  // ---------- Sortable tables ----------
  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sortedClients = useMemo(() => {
    if (!sortCol) return clientPerformance
    return [...clientPerformance].sort((a, b) => {
      let va = a[sortCol]
      let vb = b[sortCol]
      if (typeof va === 'string') va = parseFloat(va) || va
      if (typeof vb === 'string') vb = parseFloat(vb) || vb
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [clientPerformance, sortCol, sortDir])

  // ---------- Chart data — monthly interventions ----------
  const monthlyData = useMemo(() => {
    const counts = Array(12).fill(0)
    interventions.forEach(i => {
      if (i.createdAt) {
        const month = new Date(i.createdAt).getMonth()
        counts[month] += 1
      }
    })
    return MONTH_LABELS.map((label, idx) => ({
      month: label,
      interventi: counts[idx],
    }))
  }, [interventions])

  // ---------- Chart data — intervention type distribution ----------
  const typeDistribution = useMemo(() => {
    const map = {}
    interventions.forEach(i => {
      const t = i.interventionType || 'Altro'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [interventions])

  // ---------- Export CSV ----------
  const handleExportCSV = () => {
    const header = 'Codice,Apparecchiatura,Struttura,Tecnico,Stato,Esito,Priorità,Data Creazione\n'
    const rows = interventions.map(i =>
      `${i.code},${i.deviceName},${i.structure},${i.techName},${i.status},${i.outcome || '-'},${i.priority},${i.createdAt || '-'}`
    ).join('\n')
    const csv = header + rows
    navigator.clipboard.writeText(csv)
    addToast('success', 'CSV copiato negli appunti!')
  }

  // ---------- Sort indicator ----------
  const sortIcon = (col) => {
    if (sortCol !== col) return <span className="text-gray-300 ml-1">&#8597;</span>
    return <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>
  }

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Report & Analytics" subtitle="Analisi operativa e performance">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Download size={16} /> Esporta CSV
        </button>
      </SectionHeader>

      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {PERIOD_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${period === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Activity} value={totalInterventions} label="Interventi Totali" color="#2E86C1" />
        <KpiCard icon={CheckCircle2} value={`${risolti} (${risoltiPct}%)`} label="Risolti" color="#27AE60" />
        <KpiCard icon={AlertCircle} value={`${parziali} (${parzialiPct}%)`} label="Parziali" color="#E67E22" />
        <KpiCard icon={AlertTriangle} value={`${escalation} (${escalationPct}%)`} label="Escalation" color="#C0392B" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Clock} value={`${mttr}h`} label="MTTR Medio" color="#8E44AD" />
        <KpiCard icon={Shield} value={`${slaRate}%`} label="SLA Rispettato" color="#0E9AA7" />
        <KpiCard icon={DollarSign} value={formatCurrency(offerteAccettate)} label="Offerte Accettate" color="#2E86C1" />
        <KpiCard icon={Package} value={formatCurrency(partsCost)} label="Valore Magazzino" color="#7F8C8D" />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Trend Interventi Mensili</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="interventi" fill="#2E86C1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Intervention type pie chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuzione per Tipo</h3>
          {typeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {typeDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} message="Nessun dato disponibile" />
          )}
        </div>
      </div>

      {/* Performance per Cliente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Performance per Cliente</h3>
        </div>
        {sortedClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('client')}>
                    Cliente {sortIcon('client')}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('count')}>
                    Interventi {sortIcon('count')}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('slaPct')}>
                    SLA Compliance % {sortIcon('slaPct')}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('spend')}>
                    Spesa Totale {sortIcon('spend')}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('uptime')}>
                    Uptime % {sortIcon('uptime')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map(c => (
                  <tr key={c.client} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.client}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{c.count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${parseFloat(c.slaPct) >= 90 ? 'text-green-600' : parseFloat(c.slaPct) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {c.slaPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.spend)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${parseFloat(c.uptime) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {c.uptime}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={BarChart3} message="Nessun dato cliente" />
        )}
      </div>

      {/* Ranking Tecnici */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Ranking Tecnici</h3>
        </div>
        {techRanking.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tecnico</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Interventi Gestiti</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Tasso Risoluzione %</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">MTTR</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Rating</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Km Percorsi</th>
                </tr>
              </thead>
              <tbody>
                {techRanking.map(t => (
                  <tr key={t.name} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{t.count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${parseFloat(t.resolutionPct) >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {t.resolutionPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{t.mttr}</td>
                    <td className="px-4 py-3 flex justify-center"><StarRating value={t.rating} /></td>
                    <td className="px-4 py-3 text-right text-gray-600">{t.km.toLocaleString('it-IT')} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Activity} message="Nessun tecnico trovato" />
        )}
      </div>
    </div>
  )
}
