import React from 'react'
import { Clock } from 'lucide-react'
import { useElapsed } from '../../hooks/useElapsed'

const SlaBadge = React.memo(function SlaBadge({ createdAt, slaMinutes = 480 }) {
  useElapsed(30000) // re-render every 30s

  if (!createdAt || !slaMinutes) return null

  const created = new Date(createdAt).getTime()
  const deadline = created + slaMinutes * 60 * 1000
  const now = Date.now()
  const remaining = deadline - now
  const percentage = remaining / (slaMinutes * 60 * 1000)

  const hours = Math.floor(Math.abs(remaining) / 3600000)
  const mins = Math.floor((Math.abs(remaining) % 3600000) / 60000)
  const isOverdue = remaining < 0

  let bgColor, textColor
  if (isOverdue) { bgColor = '#FADBD8'; textColor = '#C0392B' }
  else if (percentage > 0.75) { bgColor = '#D5F5E3'; textColor = '#27AE60' }
  else if (percentage > 0.25) { bgColor = '#FEF9E7'; textColor = '#B7950B' }
  else { bgColor = '#FADBD8'; textColor = '#C0392B' }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <Clock size={12} />
      {isOverdue ? '-' : ''}{hours}h {mins}m
    </span>
  )
})

export default SlaBadge
