import { useState, useEffect } from 'react'
import { DEMO_USERS } from '../data/demoData'
import { useAuth } from '../contexts/AuthContext'

export function useOnlineUsers() {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!user) { setOnlineUsers([]); return }
    const others = DEMO_USERS.filter(u => u.id !== user.id)
    // Initially show 2 random users as online
    const initial = others.filter(() => Math.random() > 0.3).map(u => ({
      id: u.id, name: u.name, avatar: u.avatar, color: u.color, role: u.role
    }))
    setOnlineUsers(initial.length > 0 ? initial : [others[0]].map(u => ({ id: u.id, name: u.name, avatar: u.avatar, color: u.color, role: u.role })))

    const interval = setInterval(() => {
      setOnlineUsers(
        others.filter(() => Math.random() > 0.35).map(u => ({
          id: u.id, name: u.name, avatar: u.avatar, color: u.color, role: u.role
        }))
      )
    }, 4000)
    return () => clearInterval(interval)
  }, [user])

  return onlineUsers
}
