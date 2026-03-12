import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useOnlineUsers } from '../../hooks/useOnlineUsers'
import SectionHeader from '../shared/SectionHeader'
import StatusChip from '../shared/StatusChip'
import {
  Cloud, Wifi, Shield, Lock, Database, Award, HeartPulse,
  FileText, RefreshCw, CheckCircle2, Users, Activity, Globe, Server,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Static constants
// ---------------------------------------------------------------------------
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const CHANNELS = [
  { name: 'interventions', label: 'Interventi' },
  { name: 'devices', label: 'Dispositivi' },
  { name: 'warehouse', label: 'Magazzino' },
  { name: 'notifications', label: 'Notifiche' },
]

const SECURITY_CARDS = [
  { icon: Lock,       title: 'Crittografia',  detail: 'AES-256 + TLS 1.3',              color: '#2563EB' },
  { icon: Database,   title: 'Backup',         detail: 'Ogni 15 min, retention 90 giorni', color: '#7C3AED' },
  { icon: Shield,     title: 'GDPR',           detail: 'Art. 32 — Compliance attiva',     color: '#059669' },
  { icon: Award,      title: 'ISO 27001',      detail: 'Certificazione sicurezza info',    color: '#D97706' },
  { icon: HeartPulse, title: 'ISO 13485',      detail: 'Dispositivi medici',              color: '#DC2626' },
  { icon: FileText,   title: 'Audit Log',      detail: 'Attivo con session tracking',     color: '#0891B2' },
]

const ACTION_LABELS = {
  'intervention.completed':  'Intervento completato',
  'intervention.acknowledged': 'Intervento preso in carico',
  'offer.created':           'Offerta creata',
  'contract.expiry_alert':   'Alert scadenza contratto',
  'user.login':              'Login utente',
  'warehouse.stock_alert':   'Alert scorte magazzino',
}

const fmtTimestamp = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CloudStatusPanel() {
  const { user } = useAuth()
  const { activityLog } = useGlobalStore()
  const onlineUsers = useOnlineUsers()

  const sessionId = useMemo(() => crypto.randomUUID().slice(0, 12), [])

  // Simulated last-sync timestamp that updates every 8 seconds
  const [lastSync, setLastSync] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setLastSync(new Date()), 8000)
    return () => clearInterval(interval)
  }, [])

  // Take last 10 activity log entries
  const recentLogs = activityLog.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Cloud & Sincronizzazione"
        subtitle="Stato infrastruttura e connessioni in tempo reale"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Connection Status Card                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-start gap-6">
          {/* LIVE indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />
              <Wifi size={28} className="text-green-600 relative z-10" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider">
              Live
            </span>
          </div>

          {/* Connection details */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">Stato</span>
              <span className="font-semibold text-green-700">Connesso</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Tenant ID</span>
              <span className="font-mono text-xs text-gray-700">{TENANT_ID}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Session ID</span>
              <span className="font-mono text-xs text-gray-700">{sessionId}...</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">SLA Uptime</span>
              <span className="font-semibold text-gray-800">99.95%</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Region</span>
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Globe size={12} className="text-blue-500" /> AWS EU-Central-1 (Frankfurt)
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Provider</span>
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Server size={12} className="text-emerald-500" /> Neon PostgreSQL + Vercel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Online Users                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users size={15} className="text-blue-500" /> Utenti Online
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Current user */}
          {user && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: user.color || '#2E86C1' }}
              >
                {user.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-[10px] text-blue-600 font-medium">Tu</p>
              </div>
              <span className="relative flex h-2.5 w-2.5 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            </div>
          )}

          {/* Other online users */}
          {onlineUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: u.color || '#94A3B8' }}
              >
                {u.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                <p className="text-[10px] text-gray-500 capitalize">{u.role}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                online
              </span>
            </div>
          ))}

          {onlineUsers.length === 0 && !user && (
            <p className="text-xs text-gray-400">Nessun utente online</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Real-time Sync                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <RefreshCw size={15} className="text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} /> Sincronizzazione Real-time
        </h2>
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-700">Sync Attiva</span>
          </div>
          <div className="text-xs text-gray-500">
            Ultimo sync: <span className="font-semibold text-gray-700">{lastSync.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CHANNELS.map((ch) => (
            <div key={ch.name} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              <span className="text-xs font-medium text-gray-700">{ch.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Security & Compliance                                               */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Shield size={15} className="text-indigo-500" /> Sicurezza & Compliance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECURITY_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: card.color + '15' }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{card.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Activity Log                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity size={15} className="text-amber-500" /> Activity Log
        </h2>
        <div className="max-h-[360px] overflow-y-auto -mx-1 px-1 space-y-2">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nessuna attività registrata</p>
          ) : (
            recentLogs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                  {entry.userName?.split(' ').map(w => w[0]).join('') || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">{entry.userName}</span>
                    <span className="text-[10px] text-gray-400">{ACTION_LABELS[entry.action] || entry.action}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {entry.entityType}: {entry.entityId}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{fmtTimestamp(entry.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
