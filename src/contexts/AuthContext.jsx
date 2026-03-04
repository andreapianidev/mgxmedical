import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DEMO_USERS } from '../data/demoData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('msm_session')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = useCallback((email, password) => {
    const found = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const userData = { id: found.id, name: found.name, avatar: found.avatar, role: found.role, email: found.email, color: found.color }
      setUser(userData)
      localStorage.setItem('msm_session', JSON.stringify(userData))
      return { success: true }
    }
    return { success: false, error: 'Credenziali non valide' }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('msm_session')
  }, [])

  const value = {
    user,
    login,
    logout,
    loading,
    isAdmin: user?.role === 'admin',
    isTechnician: user?.role === 'technician',
    isSecretary: user?.role === 'secretary',
    isClient: user?.role === 'client',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
