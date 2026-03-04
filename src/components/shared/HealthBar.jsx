import React from 'react'

const HealthBar = React.memo(function HealthBar({ score = 0, showLabel = true, height = 'h-2' }) {
  const color = score >= 80 ? '#27AE60' : score >= 50 ? '#F1C40F' : '#C0392B'
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-600 w-8 text-right">{score}%</span>}
    </div>
  )
})

export default HealthBar
