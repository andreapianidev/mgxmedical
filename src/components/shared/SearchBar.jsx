import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

const SearchBar = React.memo(function SearchBar({ value, onChange, placeholder = 'Cerca...', className = '' }) {
  const [local, setLocal] = useState(value || '')
  const timerRef = useRef(null)

  useEffect(() => { setLocal(value || '') }, [value])
  useEffect(() => { return () => clearTimeout(timerRef.current) }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange?.(v), 300)
  }

  const clear = () => {
    setLocal('')
    onChange?.('')
  }

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
      />
      {local && (
        <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded">
          <X size={14} className="text-gray-400" />
        </button>
      )}
    </div>
  )
})

export default SearchBar
