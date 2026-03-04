import React from 'react'

const KpiCard = React.memo(function KpiCard({ icon: Icon, value, label, trend, trendUp, color = '#2E86C1', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm p-4 border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '15' }}>
          {Icon && <Icon size={22} style={{ color }} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
})

export default KpiCard
