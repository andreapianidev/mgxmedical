import { useMemo } from 'react'
import { Plus, X } from 'lucide-react'

const EMPTY_SESSION = { date: '', techName: '', workHours: '', travelHours: '' }

export default function WorkSessionsEditor({ sessions = [], onChange, maxSessions = 3 }) {
  const rows = sessions.length > 0 ? sessions : [{ ...EMPTY_SESSION }]

  const updateSession = (idx, key, val) => {
    const next = rows.map((s, i) => i === idx ? { ...s, [key]: val } : s)
    onChange(next)
  }

  const addSession = () => {
    if (rows.length >= maxSessions) return
    onChange([...rows, { ...EMPTY_SESSION }])
  }

  const removeSession = (idx) => {
    const next = rows.filter((_, i) => i !== idx)
    onChange(next.length > 0 ? next : [{ ...EMPTY_SESSION }])
  }

  const totals = useMemo(() => ({
    workHours: rows.reduce((sum, s) => sum + (parseFloat(s.workHours) || 0), 0),
    travelHours: rows.reduce((sum, s) => sum + (parseFloat(s.travelHours) || 0), 0),
  }), [rows])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Sessioni di Lavoro</label>

      <div className="space-y-2">
        {rows.map((session, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_auto] gap-2 items-end">
            <div>
              {idx === 0 && <span className="block text-xs text-gray-400 mb-1">Data</span>}
              <input
                type="date"
                value={session.date}
                onChange={e => updateSession(idx, 'date', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              {idx === 0 && <span className="block text-xs text-gray-400 mb-1">Tecnico</span>}
              <input
                type="text"
                value={session.techName}
                onChange={e => updateSession(idx, 'techName', e.target.value)}
                placeholder="Nome tecnico"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              {idx === 0 && <span className="block text-xs text-gray-400 mb-1">Ore lavoro</span>}
              <input
                type="number"
                min="0"
                step="0.5"
                value={session.workHours}
                onChange={e => updateSession(idx, 'workHours', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              {idx === 0 && <span className="block text-xs text-gray-400 mb-1">Ore viaggio</span>}
              <input
                type="number"
                min="0"
                step="0.5"
                value={session.travelHours}
                onChange={e => updateSession(idx, 'travelHours', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="pb-0.5">
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSession(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Rimuovi sessione"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      {(totals.workHours > 0 || totals.travelHours > 0) && (
        <div className="flex justify-end gap-6 mt-2 text-xs font-semibold text-gray-600 border-t border-gray-100 pt-2">
          <span>Totale lavoro: <span className="text-blue-700">{totals.workHours}h</span></span>
          <span>Totale viaggio: <span className="text-blue-700">{totals.travelHours}h</span></span>
        </div>
      )}

      {/* Add button */}
      {rows.length < maxSessions && (
        <button
          type="button"
          onClick={addSession}
          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus size={14} /> Aggiungi sessione ({rows.length}/{maxSessions})
        </button>
      )}
    </div>
  )
}
