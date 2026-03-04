import React from 'react'

const PRIORITY_STYLES = {
  CRITICO: { bg: '#FADBD8', color: '#C0392B', border: '#C0392B' },
  ALTO: { bg: '#FDEBD0', color: '#E67E22', border: '#E67E22' },
  MEDIO: { bg: '#FEF9E7', color: '#B7950B', border: '#F1C40F' },
  BASSO: { bg: '#D5F5E3', color: '#27AE60', border: '#27AE60' },
}

const PriorityPill = React.memo(function PriorityPill({ priority }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.MEDIO
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {priority}
    </span>
  )
})

export default PriorityPill
