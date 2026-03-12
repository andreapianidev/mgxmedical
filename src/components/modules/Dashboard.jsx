import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import PriorityPill from '../shared/PriorityPill'
import SlaBadge from '../shared/SlaBadge'
import HealthBar from '../shared/HealthBar'
import SearchBar from '../shared/SearchBar'
import SectionHeader from '../shared/SectionHeader'
import Modal from '../shared/Modal'
import { Activity, Clock, CheckCircle2, Truck, Shield, Users, AlertTriangle, Search, ArrowRight, ShieldAlert } from 'lucide-react'
import { differenceInDays } from 'date-fns'

export default function Dashboard() {
  const navigate = useNavigate()
  const { interventions, devices, notifications, schedMaint, updateIntervention, fleet } = useGlobalStore()
  const { addToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [ackModal, setAckModal] = useState({ open: false, intervention: null })
  const [ackNotes, setAckNotes] = useState('')

  // --- Serial Search Engine ---
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return devices
      .filter(d =>
        d.serialNumber?.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.brand?.toLowerCase().includes(q) ||
        d.model?.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(d => {
        const relatedInt = interventions.find(i => i.deviceId === d.id && i.status !== 'completed')
        return { ...d, relatedIntervention: relatedInt }
      })
  }, [searchQuery, devices, interventions])

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const active = interventions.filter(i => i.status === 'in-progress').length
    const pending = interventions.filter(i => i.status === 'pending').length
    const completed = interventions.filter(i => i.status === 'completed').length

    const pmCompleted = schedMaint.filter(m => m.status === 'completed').length
    const pmTotal = schedMaint.length
    const compliance = pmTotal > 0 ? ((pmCompleted / pmTotal) * 100).toFixed(1) : '0.0'

    const techsInField = new Set(
      interventions
        .filter(i => i.status === 'in-progress')
        .flatMap(i => i.assignedTechs || [])
    ).size

    const criticalAlerts = notifications.filter(
      n => n.severity === 'critical' && !n.isRead
    ).length

    const activeVehicles = fleet.filter(v => v.status === 'active').length
    const fleetEff = fleet.length > 0 ? ((activeVehicles / fleet.length) * 100).toFixed(1) : '0.0'

    return { active, pending, completed, compliance, techsInField, criticalAlerts, fleetEff }
  }, [interventions, schedMaint, notifications, fleet])

  // --- Pending Interventions for Live Board ---
  const pendingInterventions = useMemo(() =>
    interventions
      .filter(i => i.status === 'pending')
      .sort((a, b) => {
        const pOrder = { CRITICO: 0, ALTO: 1, MEDIO: 2, BASSO: 3 }
        return (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9)
      }),
    [interventions]
  )

  // --- Warranty Widget ---
  const warrantyDevices = useMemo(() => {
    const now = new Date()
    return devices
      .filter(d => d.warrantyEnd)
      .map(d => {
        const daysRemaining = differenceInDays(new Date(d.warrantyEnd), now)
        return { ...d, daysRemaining }
      })
      .filter(d => d.daysRemaining <= 90)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  }, [devices])

  // --- Acknowledge handler ---
  const handleAcknowledge = async () => {
    if (!ackModal.intervention) return
    try {
      await updateIntervention(ackModal.intervention.id, {
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        notes: ackNotes ? `${ackModal.intervention.notes || ''}\n[Presa in carico] ${ackNotes}`.trim() : ackModal.intervention.notes,
      })
    } catch (err) {
      addToast('error', 'Errore durante la presa in carico dell\'intervento.')
    }
    setAckModal({ open: false, intervention: null })
    setAckNotes('')
  }

  const openAckModal = (intervention) => {
    setAckModal({ open: true, intervention })
    setAckNotes('')
  }

  // --- Warranty badge color ---
  const warrantyBadge = (days) => {
    if (days < 0) return { bg: '#FADBD8', color: '#C0392B', label: 'Scaduta' }
    if (days <= 30) return { bg: '#FADBD8', color: '#C0392B', label: `${days}gg` }
    if (days <= 60) return { bg: '#FDEBD0', color: '#E67E22', label: `${days}gg` }
    return { bg: '#FEF9E7', color: '#B7950B', label: `${days}gg` }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Centro di Controllo"
        subtitle="Panoramica operativa in tempo reale"
      />

      {/* Serial Search Engine */}
      <div className="relative">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca per seriale, nome, marca, modello..."
          className="w-full"
        />

        {searchQuery.trim() && (
          <div className="mt-3">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map(d => (
                  <div
                    key={d.id}
                    onClick={() => navigate('/dhr')}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-800 leading-tight">{d.name}</h4>
                      <StatusChip status={d.status} />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">S/N: <span className="font-mono font-medium text-gray-700">{d.serialNumber}</span></p>
                    <p className="text-xs text-gray-500 mb-2">{d.client}</p>
                    <HealthBar score={d.healthScore} height="h-1.5" />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        Apri DHR <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 text-center">
                <Search size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nessun dispositivo trovato per "<span className="font-medium">{searchQuery}</span>"</p>
                <p className="text-xs text-gray-400 mt-1">Prova con un seriale, nome o marca differente</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard icon={Activity} value={kpis.active} label="Interventi Attivi" color="#2E86C1" />
        <KpiCard icon={Clock} value={kpis.pending} label="In Attesa" color="#E67E22" />
        <KpiCard icon={CheckCircle2} value={kpis.completed} label="Completati" color="#27AE60" />
        <KpiCard icon={Truck} value={`${kpis.fleetEff}%`} label="Efficienza Flotta" color="#1ABC9C" />
        <KpiCard icon={Shield} value={`${kpis.compliance}%`} label="Compliance Score" color="#8E44AD" />
        <KpiCard icon={Users} value={kpis.techsInField} label="Tecnici in Campo" color="#17A2B8" />
        <KpiCard icon={AlertTriangle} value={kpis.criticalAlerts} label="Allerte ML Critiche" color="#C0392B" />
      </div>

      {/* Two-column layout: Live Board + Warranty Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Requests Board */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Richieste Live</h2>
              <p className="text-xs text-gray-500 mt-0.5">{pendingInterventions.length} interventi in attesa</p>
            </div>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
            {pendingInterventions.length > 0 ? pendingInterventions.map(intv => (
              <div
                key={intv.id}
                className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{intv.code}</span>
                    <PriorityPill priority={intv.priority} />
                    <SlaBadge createdAt={intv.createdAt} slaMinutes={intv.slaMinutes} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-1">{intv.deviceName}</p>
                <p className="text-xs text-gray-500 mb-3">{intv.structure} — {intv.department}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Tecnico: <span className="text-gray-600 font-medium">{intv.techName || 'Non assegnato'}</span>
                  </span>
                  <button
                    onClick={() => openAckModal(intv)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Prendi in carico
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <CheckCircle2 size={32} className="mx-auto text-green-300 mb-2" />
                <p className="text-sm text-gray-500">Nessuna richiesta in attesa</p>
                <p className="text-xs text-gray-400 mt-1">Tutte le richieste sono state prese in carico</p>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Widget */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Garanzie</h2>
              <p className="text-xs text-gray-500 mt-0.5">In scadenza o scadute</p>
            </div>
            <ShieldAlert size={18} className="text-orange-500" />
          </div>
          <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
            {warrantyDevices.length > 0 ? warrantyDevices.map(d => {
              const badge = warrantyBadge(d.daysRemaining)
              return (
                <div
                  key={d.id}
                  onClick={() => navigate('/registry')}
                  className="flex items-center justify-between p-3 border border-gray-50 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{d.serialNumber}</p>
                  </div>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {d.daysRemaining < 0 ? badge.label : badge.label}
                  </span>
                </div>
              )
            }) : (
              <div className="text-center py-8">
                <Shield size={32} className="mx-auto text-green-300 mb-2" />
                <p className="text-sm text-gray-500">Tutte le garanzie sono in regola</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acknowledge Modal */}
      <Modal
        isOpen={ackModal.open}
        onClose={() => setAckModal({ open: false, intervention: null })}
        title="Prendi in carico"
        subtitle={ackModal.intervention ? `${ackModal.intervention.code} — ${ackModal.intervention.deviceName}` : ''}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {ackModal.intervention && <PriorityPill priority={ackModal.intervention.priority} />}
              {ackModal.intervention && (
                <SlaBadge createdAt={ackModal.intervention.createdAt} slaMinutes={ackModal.intervention.slaMinutes} />
              )}
            </div>
            <p className="text-sm text-gray-600">{ackModal.intervention?.structure} — {ackModal.intervention?.department}</p>
            <p className="text-xs text-gray-500 mt-1">{ackModal.intervention?.description}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
            <textarea
              value={ackNotes}
              onChange={e => setAckNotes(e.target.value)}
              rows={3}
              placeholder="Aggiungi note sulla presa in carico..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setAckModal({ open: false, intervention: null })}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAcknowledge}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Conferma presa in carico
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
