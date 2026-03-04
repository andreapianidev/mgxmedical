import React, { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { NAV_ITEMS } from '../../lib/constants'
import { LogOut, X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

const Sidebar = React.memo(function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { unreadCount } = useGlobalStore()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const visibleItems = useMemo(() => {
    if (!user) return []
    return NAV_ITEMS.filter(item => item.roles.includes(user.role))
  }, [user])

  const handleNav = (id) => {
    navigate(`/${id}`)
    onClose?.()
  }

  const handleLogout = () => {
    logout()
    addToast('info', 'Sessione terminata')
    navigate('/')
  }

  const currentPath = location.pathname.split('/')[1] || 'dashboard'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col sidebar-transition
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[210px]`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold bg-gradient-to-r from-[#1B4F72] to-[#148F77] bg-clip-text text-transparent">
              MGX Medical
            </h1>
            <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">Service Manager</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {visibleItems.map(item => {
            const Icon = LucideIcons[item.icon] || LucideIcons.Circle
            const isActive = currentPath === item.id
            const isNotif = item.id === 'notifications'
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5
                  ${isActive
                    ? 'bg-[#D6EAF8] text-[#1B4F72] font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                <Icon size={17} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {isNotif && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + Logout */}
        {user && (
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: user.color }}
              >
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              <span>Esci</span>
            </button>
          </div>
        )}
      </aside>
    </>
  )
})

export default Sidebar
