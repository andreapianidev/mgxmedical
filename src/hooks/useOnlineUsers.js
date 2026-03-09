import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGlobalStore } from '../contexts/GlobalStoreContext'

export function useOnlineUsers() {
  const { user } = useAuth()
  const { users } = useGlobalStore()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!user || users.length === 0) { setOnlineUsers([]); return }
    const others = users.filter(u => u.id !== user.id)

    // Show all other users as online (real users from DB)
    const mapUser = (u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar || u.name?.split(' ').map(w => w[0]).join('').toUpperCase(),
      color: u.color || '#94A3B8',
      role: u.role,
    })

    setOnlineUsers(others.map(mapUser))
  }, [user, users])

  return onlineUsers
}
