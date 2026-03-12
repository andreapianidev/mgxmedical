import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import SectionHeader from '../shared/SectionHeader'
import EmptyState from '../shared/EmptyState'
import SearchBar from '../shared/SearchBar'
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Pin, Eye, Trash2, Check, Filter } from 'lucide-react'

const TYPE_TABS = [
  { key: 'Tutte', label: 'Tutte' },
  { key: 'alert', label: 'Critiche', color: '#C0392B' },
  { key: 'warning', label: 'Warning', color: '#E67E22' },
  { key: 'info', label: 'Info', color: '#2E86C1' },
  { key: 'success', label: 'Successo', color: '#27AE60' },
]

const CATEGORIES = ['Tutte le categorie', 'ML Engine', 'Garanzie', 'Interventi', 'Contratti', 'Sistema']

const TYPE_STYLES = {
  alert:   { border: '#C0392B', bg: '#FADBD8', color: '#C0392B', Icon: AlertTriangle },
  warning: { border: '#E67E22', bg: '#FDEBD0', color: '#E67E22', Icon: AlertCircle },
  info:    { border: '#2E86C1', bg: '#D6EAF8', color: '#2E86C1', Icon: Info },
  success: { border: '#27AE60', bg: '#D5F5E3', color: '#27AE60', Icon: CheckCircle2 },
}

// ── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return ''
  const now = Date.now()
  const then = new Date(isoStr).getTime()
  const diffMs = now - then
  if (diffMs < 0) return 'adesso'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'adesso'
  if (minutes < 60) return `${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ieri'
  if (days < 30) return `${days} giorni fa`

  const months = Math.floor(days / 30)
  return `${months} mes${months === 1 ? 'e' : 'i'} fa`
}

// ── Severity label helper ────────────────────────────────────────────────────
function severityLabel(sev) {
  const map = { critical: 'Critica', high: 'Alta', medium: 'Media', low: 'Bassa' }
  return map[sev] || sev || ''
}

function severityBadgeStyle(sev) {
  const styles = {
    critical: { bg: '#FADBD8', color: '#C0392B' },
    high:     { bg: '#FDEBD0', color: '#E67E22' },
    medium:   { bg: '#FEF9E7', color: '#B7950B' },
    low:      { bg: '#D5F5E3', color: '#27AE60' },
  }
  return styles[sev] || { bg: '#F2F4F4', color: '#7F8C8D' }
}

export default function NotificationsCenterV2() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    toggleNotificationPin,
    deleteNotification,
    unreadCount,
  } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [typeTab, setTypeTab] = useState('Tutte')
  const [category, setCategory] = useState('Tutte le categorie')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // ── KPI counters ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    critical: notifications.filter(n => n.type === 'alert' && !n.isRead).length,
    pinned: notifications.filter(n => n.isPinned).length,
  }), [notifications])

  // ── Delete with confirmation ─────────────────────────────────────────────
  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      deleteNotification(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000)
    }
  }

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...notifications]

    // Text search
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      )
    }

    // Type filter
    if (typeTab !== 'Tutte') {
      list = list.filter(n => n.type === typeTab)
    }

    // Category filter
    if (category !== 'Tutte le categorie') {
      list = list.filter(n => n.category === category)
    }

    // Sort: pinned first, then by createdAt descending
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    return list
  }, [notifications, search, typeTab, category])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Centro Notifiche"
        subtitle={`${unreadCount} notifiche non lette`}
      >
        <button
          onClick={markAllNotificationsRead}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Check size={16} /> Segna tutte come lette
        </button>
      </SectionHeader>

      {/* ── KPI Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
            <Bell size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{kpis.total}</p>
            <p className="text-xs text-gray-500">Totali</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
            <Info size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{kpis.unread}</p>
            <p className="text-xs text-gray-500">Non lette</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{kpis.critical}</p>
            <p className="text-xs text-gray-500">Critiche non lette</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
            <Pin size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{kpis.pinned}</p>
            <p className="text-xs text-gray-500">Fissate</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca notifiche..." className="flex-1" />
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Type tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {TYPE_TABS.map(tab => {
          const isActive = typeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setTypeTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? tab.color ? '' : 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={isActive && tab.color ? { color: tab.color, borderColor: tab.color } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Notification list ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          message="Nessuna notifica"
          description="Non ci sono notifiche che corrispondono ai filtri selezionati."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.info
            const IconComp = style.Icon
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm transition-all ${
                  n.isRead ? 'opacity-60' : ''
                }`}
                style={{ borderLeftWidth: 4, borderLeftColor: style.border }}
              >
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: style.bg }}
                >
                  <IconComp size={18} style={{ color: style.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
                    {n.isPinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        <Pin size={10} /> Fissata
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: style.bg, color: style.color }}
                    >
                      {n.category}
                    </span>
                    {n.severity && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={severityBadgeStyle(n.severity)}
                      >
                        {severityLabel(n.severity)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{relativeTime(n.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleNotificationPin(n.id)}
                    title={n.isPinned ? 'Rimuovi fissaggio' : 'Fissa in alto'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      n.isPinned
                        ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-amber-500'
                    }`}
                  >
                    <Pin size={15} />
                  </button>
                  {!n.isRead && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      title="Segna come letta"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title={confirmDeleteId === n.id ? 'Conferma eliminazione' : 'Elimina'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      confirmDeleteId === n.id
                        ? 'text-white bg-red-500 hover:bg-red-600'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'
                    }`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Summary footer ── */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
        <span>{filtered.length} notifiche visualizzate su {notifications.length} totali</span>
        <span>{unreadCount} non lette &middot; {notifications.filter(n => n.isPinned).length} fissate</span>
      </div>
    </div>
  )
}
