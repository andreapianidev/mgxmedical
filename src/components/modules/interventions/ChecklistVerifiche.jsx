import { useMemo } from 'react'
import { CHECKLIST_ITEMS } from '../../../lib/constants'

export default function ChecklistVerifiche({ value = {}, onChange }) {
  const checkedCount = useMemo(
    () => CHECKLIST_ITEMS.filter(item => value[item.key]).length,
    [value]
  )

  const toggleItem = (key) => {
    onChange({ ...value, [key]: !value[key] })
  }

  const toggleAll = () => {
    const allChecked = checkedCount === CHECKLIST_ITEMS.length
    const next = {}
    CHECKLIST_ITEMS.forEach(item => { next[item.key] = !allChecked })
    onChange(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Controlli e Verifiche
          <span className="ml-2 text-xs font-normal text-gray-400">
            {checkedCount}/{CHECKLIST_ITEMS.length} completati
          </span>
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          {checkedCount === CHECKLIST_ITEMS.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-gray-100 rounded-lg p-3 bg-gray-50/50 max-h-64 overflow-y-auto">
        {CHECKLIST_ITEMS.map(item => (
          <label
            key={item.key}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm
              ${value[item.key] ? 'bg-green-50 text-green-800' : 'hover:bg-white text-gray-600'}`}
          >
            <input
              type="checkbox"
              checked={!!value[item.key]}
              onChange={() => toggleItem(item.key)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
            />
            <span className="text-xs leading-tight">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
