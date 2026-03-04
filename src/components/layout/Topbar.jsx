import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Cloud, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useOnlineUsers } from '../../hooks/useOnlineUsers'
import { NAV_ITEMS } from '../../lib/constants'

const Topbar = React.memo(function Topbar({ onToggleSidebar }) {
  const { user } = useAuth()
  const { unreadCount } = useGlobalStore()
  const onlineUsers = useOnlineUsers()
  const location = useLocation()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const currentPath = location.pathname.split('/')[1] || 'dashboard'
  const currentSection = NAV_ITEMS.find(i => i.id === currentPath)

  const timeStr = time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left: hamburger + section name */}
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <Menu size={20} className="text-gray-600" />
        </button>
        <h2 className="text-sm font-semibold text-gray-700">
          {currentSection?.label || 'Dashboard'}
        </h2>
      </div>

      {/* Center: online users */}
      <div className="hidden md:flex items-center gap-1">
        {onlineUsers.map(u => (
          <div
            key={u.id}
            title={u.name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white -ml-1 first:ml-0"
            style={{ backgroundColor: u.color }}
          >
            {u.avatar}
          </div>
        ))}
        {onlineUsers.length > 0 && (
          <span className="text-[10px] text-gray-400 ml-1">{onlineUsers.length} online</span>
        )}
      </div>

      {/* Right: clock, cloud, bell, user */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
          <Clock size={13} />
          <span className="font-mono">{timeStr}</span>
        </div>

        {/* Cloud Live */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-live" />
          <Cloud size={15} className="text-green-600" />
        </div>

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 hover:bg-gray-100 rounded-lg"
        >
          <Bell size={18} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: user.color }}
            >
              {user.avatar}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-700 leading-tight">{user.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{user.role === 'admin' ? '\u{1F451}' : user.role === 'technician' ? '\u{1F527}' : user.role === 'secretary' ? '\u{1F4CB}' : '\u{1F3E5}'} {
                user.role === 'admin' ? 'Admin' : user.role === 'technician' ? 'Tecnico' : user.role === 'secretary' ? 'Segreteria' : 'Cliente'
              }</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
})

export default Topbar
