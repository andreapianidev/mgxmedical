import React from 'react'

const STATUS_STYLES = {
  completed: { bg: '#D5F5E3', color: '#27AE60', label: 'Completato' },
  'in-progress': { bg: '#D6EAF8', color: '#2E86C1', label: 'In corso' },
  pending: { bg: '#FDEBD0', color: '#E67E22', label: 'In attesa' },
  acknowledged: { bg: '#E8DAEF', color: '#8E44AD', label: 'Preso in carico' },
  planned: { bg: '#D5F5E3', color: '#27AE60', label: 'Pianificata' },
  overdue: { bg: '#FADBD8', color: '#C0392B', label: 'Scaduta' },
  active: { bg: '#D5F5E3', color: '#27AE60', label: 'Attivo' },
  expiring: { bg: '#FDEBD0', color: '#E67E22', label: 'In scadenza' },
  expired: { bg: '#FADBD8', color: '#C0392B', label: 'Scaduto' },
  draft: { bg: '#F2F4F4', color: '#7F8C8D', label: 'Bozza' },
  sent: { bg: '#D6EAF8', color: '#2E86C1', label: 'Inviato' },
  issued: { bg: '#D6EAF8', color: '#1B4F72', label: 'Emessa' },
  paid: { bg: '#D5F5E3', color: '#27AE60', label: 'Pagata' },
  operative: { bg: '#D5F5E3', color: '#27AE60', label: 'Operativo' },
  standby: { bg: '#FDEBD0', color: '#E67E22', label: 'Standby' },
  maintenance: { bg: '#D6EAF8', color: '#2E86C1', label: 'In Manutenzione' },
  decommissioned: { bg: '#F2F4F4', color: '#7F8C8D', label: 'Dismesso' },
  available: { bg: '#D5F5E3', color: '#27AE60', label: 'Disponibile' },
  'in-use': { bg: '#D6EAF8', color: '#2E86C1', label: 'In uso' },
}

const StatusChip = React.memo(function StatusChip({ status, customLabel }) {
  const style = STATUS_STYLES[status] || { bg: '#F2F4F4', color: '#7F8C8D', label: status }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {customLabel || style.label}
    </span>
  )
})

export default StatusChip
