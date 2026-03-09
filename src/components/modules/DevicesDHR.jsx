import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import StatusChip from '../shared/StatusChip'
import HealthBar from '../shared/HealthBar'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import {
  FileText, Search, Activity, Shield, Wrench,
  Clock, TrendingUp, Calendar, ChevronRight, Cpu
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, differenceInDays } from 'date-fns'

const CATEGORIES = ['Diagnostica', 'Terapeutica', 'Monitoraggio', 'Laboratorio', 'Altro']
const CLASS_MDR = ['I', 'IIa', 'IIb', 'III']

// ---------------------------------------------------------------------------
// HealthChart — Line chart for health score over time
// ---------------------------------------------------------------------------
function HealthChart({ dataPoints }) {
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-gray-400">
        Dati insufficienti per generare il grafico
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dataPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [`${value}%`, 'Health']}
        />
        <Line
          type="monotone"
          dataKey="health"
          stroke="#2E86C1"
          strokeWidth={2}
          dot={{ r: 4, fill: '#2E86C1', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Main Module
// ---------------------------------------------------------------------------
export default function DevicesDHR() {
  const { devices, interventions, schedMaint } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [selectedDevice, setSelectedDevice] = useState(null)

  // --- Filtered devices ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter(d => {
      if (q && ![d.name, d.brand, d.model, d.serialNumber, d.client, d.location]
        .some(f => f?.toLowerCase().includes(q))) return false
      if (filterCategory && d.category !== filterCategory) return false
      if (filterClass && d.classMDR !== filterClass) return false
      return true
    })
  }, [devices, search, filterCategory, filterClass])

  // --- Data for DHR panel ---
  const dhrData = useMemo(() => {
    if (!selectedDevice) return null

    // Interventions for this device
    const devInterventions = interventions
      .filter(i => i.deviceId === selectedDevice.id || i.deviceSerial === selectedDevice.serialNumber)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    // Health chart data points — build from intervention history
    const chartData = []
    // Add install date with assumed 100% health
    if (selectedDevice.installDate) {
      chartData.push({
        date: format(new Date(selectedDevice.installDate), 'dd/MM/yy'),
        health: 100,
        ts: new Date(selectedDevice.installDate).getTime(),
      })
    }
    devInterventions.forEach(intv => {
      if (intv.healthPre != null) {
        chartData.push({
          date: format(new Date(intv.createdAt), 'dd/MM/yy'),
          health: intv.healthPre,
          ts: new Date(intv.createdAt).getTime(),
          label: `Pre ${intv.code}`,
        })
      }
      if (intv.healthPost != null && intv.closedAt) {
        chartData.push({
          date: format(new Date(intv.closedAt), 'dd/MM/yy'),
          health: intv.healthPost,
          ts: new Date(intv.closedAt).getTime(),
          label: `Post ${intv.code}`,
        })
      }
    })
    // Add current health as last point
    chartData.push({
      date: 'Oggi',
      health: selectedDevice.healthScore,
      ts: Date.now(),
    })
    // Sort by timestamp
    chartData.sort((a, b) => a.ts - b.ts)

    // Operative metrics
    const totalInterventions = devInterventions.length
    const completedInterventions = devInterventions.filter(i => i.status === 'completed')
    const totalServiceHours = selectedDevice.serviceHours || 0
    const mtbf = selectedDevice.mtbf || (totalInterventions > 0 ? Math.round(totalServiceHours / totalInterventions) : totalServiceHours)

    // Next scheduled PM
    const nextPM = schedMaint
      .filter(m => m.deviceId === selectedDevice.id && m.status === 'planned')
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null

    // ML prediction — deterministic based on health score and intervention history
    const healthPenalty = totalInterventions > 0 ? Math.min(15, totalInterventions * 3) : 0
    const failureProbability = Math.max(5, Math.min(95, 100 - selectedDevice.healthScore + healthPenalty))
    const estimatedHoursToNext = selectedDevice.mtbf
      ? Math.round(selectedDevice.mtbf * (selectedDevice.healthScore / 100))
      : Math.round(1000 * (selectedDevice.healthScore / 100))

    // Warranty status
    const warrantyDaysLeft = selectedDevice.warrantyEnd
      ? differenceInDays(new Date(selectedDevice.warrantyEnd), new Date())
      : null

    return {
      devInterventions,
      chartData,
      totalInterventions,
      completedInterventions,
      totalServiceHours,
      mtbf,
      nextPM,
      failureProbability,
      estimatedHoursToNext,
      warrantyDaysLeft,
    }
  }, [selectedDevice, interventions, schedMaint])

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <SectionHeader title="Dispositivi DHR" subtitle="Device History Record — Tracciabilita ISO 13485" />

      {/* Search + Filters */}
      <SearchBar value={search} onChange={setSearch} placeholder="Cerca dispositivo, seriale, marca, cliente..." className="w-full" />

      <div className="flex flex-wrap items-center gap-3">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tutte le Categorie</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tutte le Classi MDR</option>
          {CLASS_MDR.map(c => <option key={c} value={c}>Classe {c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} dispositivi</span>
      </div>

      {/* Device cards grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => {
            const warrantyDays = d.warrantyEnd ? differenceInDays(new Date(d.warrantyEnd), new Date()) : null
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDevice(d)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
              >
                {/* Top: name + class badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 leading-tight truncate">{d.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{d.brand} {d.model}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 shrink-0 ml-2">
                    {d.classMDR}
                  </span>
                </div>

                {/* S/N + Client + Location */}
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-gray-500">S/N: <span className="font-mono font-medium text-gray-700">{d.serialNumber}</span></p>
                  <p className="text-xs text-gray-500">{d.client} — <span className="text-gray-400">{d.location}</span></p>
                </div>

                {/* Health */}
                <div className="mb-3">
                  <HealthBar score={d.healthScore} height="h-2" />
                </div>

                {/* Status + dates */}
                <div className="flex items-center justify-between">
                  <StatusChip status={d.status} />
                  <div className="text-right text-xs text-gray-400">
                    {d.installDate && <p>Inst. {format(new Date(d.installDate), 'dd/MM/yyyy')}</p>}
                    {warrantyDays !== null && (
                      <p className={warrantyDays < 0 ? 'text-red-500 font-medium' : warrantyDays < 90 ? 'text-orange-500' : ''}>
                        Gar. {warrantyDays < 0 ? 'Scaduta' : `${warrantyDays}gg`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-end">
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Apri DHR <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} message="Nessun dispositivo trovato" description="Prova a modificare i filtri di ricerca" />
      )}

      {/* ================================================================= */}
      {/* DHR Panel (Modal)                                                   */}
      {/* ================================================================= */}
      <Modal
        isOpen={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice?.name || ''}
        subtitle={`DHR — ${selectedDevice?.brand} ${selectedDevice?.model}`}
        maxWidth="max-w-3xl"
      >
        {selectedDevice && dhrData && (
          <div className="space-y-6">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700">Classe {selectedDevice.classMDR}</span>
              <StatusChip status={selectedDevice.status} />
              <div className="flex items-center gap-1 ml-auto">
                <Activity size={14} className="text-blue-500" />
                <span className="text-sm font-bold text-gray-800">{selectedDevice.healthScore}%</span>
                {selectedDevice.healthScore >= 80 && <TrendingUp size={14} className="text-green-500" />}
              </div>
            </div>

            {/* Technical Specs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Cpu size={14} className="text-gray-400" /> Specifiche Tecniche
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm bg-gray-50 rounded-lg p-4">
                <div><span className="text-xs text-gray-400">Brand</span><p className="font-medium text-gray-800">{selectedDevice.brand}</p></div>
                <div><span className="text-xs text-gray-400">Modello</span><p className="font-medium text-gray-800">{selectedDevice.model}</p></div>
                <div><span className="text-xs text-gray-400">Serial Number</span><p className="font-mono font-medium text-gray-800">{selectedDevice.serialNumber}</p></div>
                <div><span className="text-xs text-gray-400">Codice Inventario</span><p className="font-mono text-gray-700">{selectedDevice.inventoryCode}</p></div>
                <div><span className="text-xs text-gray-400">Data Installazione</span><p className="text-gray-700">{selectedDevice.installDate ? format(new Date(selectedDevice.installDate), 'dd/MM/yyyy') : '-'}</p></div>
                <div>
                  <span className="text-xs text-gray-400">Fine Garanzia</span>
                  <p className={`font-medium ${dhrData.warrantyDaysLeft !== null && dhrData.warrantyDaysLeft < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {selectedDevice.warrantyEnd ? format(new Date(selectedDevice.warrantyEnd), 'dd/MM/yyyy') : '-'}
                    {dhrData.warrantyDaysLeft !== null && (
                      <span className="text-xs ml-1">({dhrData.warrantyDaysLeft < 0 ? 'scaduta' : `${dhrData.warrantyDaysLeft}gg`})</span>
                    )}
                  </p>
                </div>
                <div><span className="text-xs text-gray-400">Ore Servizio</span><p className="font-medium text-gray-800">{dhrData.totalServiceHours.toLocaleString('it-IT')} h</p></div>
                <div><span className="text-xs text-gray-400">Categoria</span><p className="text-gray-700">{selectedDevice.category}</p></div>
              </div>
            </div>

            {/* Compliance badge */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <Shield size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Conforme MDR 2017/745 — ISO 13485:2016</p>
                <p className="text-xs text-green-600">Dispositivo registrato e tracciato nel sistema DHR</p>
              </div>
            </div>

            {/* Health chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Activity size={14} className="text-gray-400" /> Andamento Health Score
              </h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <HealthChart dataPoints={dhrData.chartData} />
              </div>
            </div>

            {/* Intervention history */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Wrench size={14} className="text-gray-400" /> Storico Interventi ({dhrData.totalInterventions})
              </h3>
              {dhrData.devInterventions.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dhrData.devInterventions.map(intv => (
                    <div key={intv.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg text-xs">
                      <div className="shrink-0 w-16 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-white ${
                          intv.interventionType === 'Correttiva' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {intv.interventionType === 'Correttiva' ? 'CORR' : 'PREV'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-800">{intv.code}</span>
                          <StatusChip status={intv.status} />
                        </div>
                        <p className="text-gray-500 truncate">{intv.description}</p>
                        <p className="text-gray-400 mt-0.5">Tecnico: {intv.techName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gray-500">{format(new Date(intv.createdAt), 'dd/MM/yyyy')}</p>
                        {intv.healthPre != null && (
                          <p className="font-medium mt-0.5">
                            <span className="text-red-500">{intv.healthPre}%</span>
                            {intv.healthPost != null && <> → <span className="text-green-600">{intv.healthPost}%</span></>}
                          </p>
                        )}
                        {intv.outcome && <p className="text-green-600 font-medium mt-0.5">{intv.outcome}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-3">Nessun intervento registrato per questo dispositivo.</p>
              )}
            </div>

            {/* Operative Metrics */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Clock size={14} className="text-gray-400" /> Metriche Operative
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{dhrData.totalServiceHours.toLocaleString('it-IT')}</p>
                  <p className="text-xs text-gray-500 mt-1">Ore Servizio</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{dhrData.mtbf.toLocaleString('it-IT')}</p>
                  <p className="text-xs text-gray-500 mt-1">MTBF (ore)</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{dhrData.totalInterventions}</p>
                  <p className="text-xs text-gray-500 mt-1">Interventi Totali</p>
                </div>
              </div>
            </div>

            {/* ML Prediction section (static demo) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <TrendingUp size={14} className="text-gray-400" /> Predizione ML
              </h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Probabilita Guasto (7gg)</p>
                    <p className="text-3xl font-bold text-blue-800">{dhrData.failureProbability}%</p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${dhrData.failureProbability}%`,
                          backgroundColor: dhrData.failureProbability > 60 ? '#C0392B' : dhrData.failureProbability > 30 ? '#E67E22' : '#27AE60',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Ore Stimate al Prossimo Intervento</p>
                    <p className="text-3xl font-bold text-blue-800">{dhrData.estimatedHoursToNext.toLocaleString('it-IT')}</p>
                    <p className="text-xs text-blue-500 mt-2">Basato su LSTM+TCN+RF (accuracy 87.3%)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Scheduled PM */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Calendar size={14} className="text-gray-400" /> Prossima Manutenzione Programmata
              </h3>
              {dhrData.nextPM ? (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Calendar size={20} className="text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      {format(new Date(dhrData.nextPM.scheduledDate), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <p className="text-xs text-blue-600">{dhrData.nextPM.frequency} — Tecnico: {dhrData.nextPM.techName}</p>
                    {dhrData.nextPM.notes && <p className="text-xs text-blue-500 mt-1">{dhrData.nextPM.notes}</p>}
                  </div>
                  <StatusChip status={dhrData.nextPM.status} />
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">Nessuna manutenzione programmata.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
