import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { DEMO_USERS } from '../../data/demoData'
import SectionHeader from '../shared/SectionHeader'
import KpiCard from '../shared/KpiCard'
import StatusChip from '../shared/StatusChip'
import Modal from '../shared/Modal'
import PriorityPill from '../shared/PriorityPill'
import { Truck, MapPin, TrendingUp, Navigation, User, Phone, ExternalLink } from 'lucide-react'

// ---------------------------------------------------------------------------
// Technician status configuration
// ---------------------------------------------------------------------------
const TECH_STATUS = {
  'on-site':   { dot: '#06B6D4', label: 'Sul posto',   bg: '#ECFEFF' },
  traveling:   { dot: '#EAB308', label: 'In viaggio',  bg: '#FEFCE8' },
  available:   { dot: '#22C55E', label: 'Disponibile', bg: '#F0FDF4' },
}

// ---------------------------------------------------------------------------
// Helper: derive technician status from their active interventions
// ---------------------------------------------------------------------------
function deriveTechStatus(techName, interventions) {
  const active = interventions.filter(
    i => i.techName === techName && i.status === 'in-progress'
  )
  if (active.length > 0) return 'on-site'
  const ack = interventions.filter(
    i => i.techName === techName && i.status === 'acknowledged'
  )
  if (ack.length > 0) return 'traveling'
  return 'available'
}

export default function FleetModule() {
  const { fleet, interventions } = useGlobalStore()

  // --- Navigation modal state ---
  const [navModal, setNavModal] = useState({ open: false, tech: null, intervention: null })

  // --- Build technician list from DEMO_USERS + fleet ---
  const technicians = useMemo(() => {
    // Start with DEMO_USERS technicians
    const techUsers = DEMO_USERS.filter(u => u.role === 'technician')
    // Also consider fleet-assigned tech names not already present
    const techMap = new Map(techUsers.map(t => [t.name, t]))
    fleet.forEach(v => {
      if (v.techName && !techMap.has(v.techName)) {
        techMap.set(v.techName, {
          id: v.techId || v.techName,
          name: v.techName,
          avatar: v.techName.split(' ').map(w => w[0]).join('').toUpperCase(),
          role: 'technician',
          color: '#2E86C1',
        })
      }
    })

    return Array.from(techMap.values()).map(tech => {
      const vehicle = fleet.find(v => v.techName === tech.name)
      const status = deriveTechStatus(tech.name, interventions)
      const activeCount = interventions.filter(
        i => i.techName === tech.name && i.status === 'in-progress'
      ).length
      const activeIntervention = interventions.find(
        i => i.techName === tech.name && i.status === 'in-progress'
      )
      return { ...tech, vehicle, status, activeCount, activeIntervention }
    })
  }, [fleet, interventions])

  // --- KPIs ---
  const activeVehicles = fleet.filter(v => v.status === 'active').length
  const totalVehicles = fleet.length
  const totalKmToday = fleet.reduce((sum, v) => sum + (v.kmToday || 0), 0)

  // --- Navigation helpers ---
  const openNavModal = (tech) => {
    if (!tech.activeIntervention) return
    setNavModal({ open: true, tech, intervention: tech.activeIntervention })
  }

  const googleMapsUrl = (address) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

  const wazeUrl = (address) =>
    `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`

  // --- Vehicle status label helper ---
  const vehicleStatusLabel = (status) => {
    const map = { active: 'In servizio', parked: 'Parcheggiato', maintenance: 'In officina' }
    return map[status] || status
  }

  const vehicleStatusColor = (status) => {
    const map = { active: '#22C55E', parked: '#94A3B8', maintenance: '#EAB308' }
    return map[status] || '#94A3B8'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Flotta & Tecnici"
        subtitle="Gestione veicoli e monitoraggio tecnici sul campo"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={Truck}
          value={`${activeVehicles}/${totalVehicles}`}
          label="Veicoli Attivi"
          color="#2E86C1"
        />
        <KpiCard
          icon={MapPin}
          value={totalKmToday}
          label="Km Percorsi Oggi"
          color="#27AE60"
        />
        <KpiCard
          icon={TrendingUp}
          value="87.4%"
          label="Efficienza Flotta"
          color="#1ABC9C"
        />
      </div>

      {/* Technician Cards Grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Tecnici</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {technicians.map(tech => {
            const st = TECH_STATUS[tech.status]
            return (
              <div
                key={tech.id}
                className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex flex-col gap-3"
              >
                {/* Top: Avatar + Name + Status */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: tech.color || '#2E86C1' }}
                  >
                    {tech.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{tech.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{tech.role}</p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: st.bg, color: st.dot }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.dot }}
                    />
                    {st.label}
                  </span>
                </div>

                {/* Intervention count */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Interventi attivi</span>
                  <span className="font-bold text-gray-800">{tech.activeCount}</span>
                </div>

                {/* Vehicle info */}
                {tech.vehicle ? (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{tech.vehicle.plate}</span>
                      <span className="text-xs text-gray-400">—</span>
                      <span className="text-xs text-gray-500">{tech.vehicle.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Km oggi: <span className="font-medium text-gray-700">{tech.vehicle.kmToday}</span></span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {tech.vehicle.lastPosition?.split('—')[0]?.trim() || '-'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400 text-center">
                    Nessun veicolo assegnato
                  </div>
                )}

                {/* Navigate button */}
                <button
                  onClick={() => openNavModal(tech)}
                  disabled={!tech.activeIntervention}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tech.activeIntervention
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Navigation size={14} />
                  Naviga
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Vehicle Status Cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Stato Veicoli</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {fleet.map(v => (
            <div
              key={v.id}
              className="bg-white rounded-lg border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800">{v.plate}</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: vehicleStatusColor(v.status) + '18',
                    color: vehicleStatusColor(v.status),
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: vehicleStatusColor(v.status) }}
                  />
                  {vehicleStatusLabel(v.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{v.model}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {v.techName || 'Non assegnato'}
                </span>
                <span>{v.kmToday} km</span>
              </div>
              {v.lastPosition && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
                  <MapPin size={11} />
                  {v.lastPosition}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Modal */}
      <Modal
        isOpen={navModal.open}
        onClose={() => setNavModal({ open: false, tech: null, intervention: null })}
        title="Navigazione"
        subtitle={navModal.tech ? `Tecnico: ${navModal.tech.name}` : ''}
      >
        {navModal.intervention && (
          <div className="space-y-4">
            {/* Destination */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Destinazione</p>
              <p className="text-sm font-semibold text-gray-800">
                {navModal.intervention.structure} — {navModal.intervention.department}
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={googleMapsUrl(`${navModal.intervention.structure} Milano`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={14} />
                Google Maps
              </a>
              <a
                href={wazeUrl(`${navModal.intervention.structure} Milano`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors"
              >
                <ExternalLink size={14} />
                Waze
              </a>
            </div>

            {/* Intervention details */}
            <div className="border border-gray-100 rounded-lg p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Dettagli Intervento</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Codice</span>
                <span className="text-sm font-bold text-gray-800">{navModal.intervention.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Dispositivo</span>
                <span className="text-sm text-gray-700 text-right max-w-[200px] truncate">
                  {navModal.intervention.deviceName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Priorita</span>
                <PriorityPill priority={navModal.intervention.priority} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
