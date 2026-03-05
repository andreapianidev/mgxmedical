import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const GlobalStoreContext = createContext(null)

export function GlobalStoreProvider({ children }) {
  const [devices, setDevices] = useState([])
  const [interventions, setInterventions] = useState([])
  const [warehouse, setWarehouse] = useState([])
  const [contracts, setContracts] = useState([])
  const [offers, setOffers] = useState([])
  const [schedMaint, setSchedMaint] = useState([])
  const [calEvents, setCalEvents] = useState([])
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [equipment, setEquipment] = useState([])
  const [fleet, setFleet] = useState([])
  const [attachments, setAttachments] = useState([])
  const [activityLog, setActivityLog] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Keep refs for closures that need current state
  const interventionsRef = useRef(interventions)
  useEffect(() => { interventionsRef.current = interventions }, [interventions])

  // --- Initial data fetch ---
  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      try {
        const [
          devData, intData, whData, conData, offData,
          maintData, calData, shiftData, notifData,
          eqData, fleetData, attData, logData,
        ] = await Promise.all([
          api.get('/devices'),
          api.get('/interventions'),
          api.get('/warehouse'),
          api.get('/contracts'),
          api.get('/offers'),
          api.get('/maintenance'),
          api.get('/calendar'),
          api.get('/shifts'),
          api.get('/notifications'),
          api.get('/equipment'),
          api.get('/fleet'),
          api.get('/attachments'),
          api.get('/activity-log'),
        ])

        if (cancelled) return
        setDevices(devData)
        setInterventions(intData)
        setWarehouse(whData)
        setContracts(conData)
        setOffers(offData)
        setSchedMaint(maintData)
        setCalEvents(calData)
        setShifts(shiftData)
        setNotifications(notifData)
        setEquipment(eqData)
        setFleet(fleetData)
        setAttachments(attData)
        setActivityLog(logData)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  // --- Interventions CRUD ---
  const addIntervention = useCallback(async (intervention) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...intervention, id: tempId, createdAt: new Date().toISOString(), status: 'pending' }
    setInterventions(prev => [optimistic, ...prev])

    try {
      const created = await api.post('/interventions', intervention)
      setInterventions(prev => prev.map(i => i.id === tempId ? created : i))
      // Create notification
      try {
        const notif = await api.post('/notifications', {
          title: `Nuovo intervento ${created.code}`,
          message: `${created.deviceName} - ${created.structure}`,
          notificationType: 'info',
          severity: 'medium',
          category: 'Interventi',
          relatedId: created.id,
        })
        setNotifications(prev => [notif, ...prev])
      } catch {}
      return created
    } catch (err) {
      setInterventions(prev => prev.filter(i => i.id !== tempId))
      throw err
    }
  }, [])

  const updateIntervention = useCallback(async (id, updates) => {
    const prev = interventionsRef.current
    setInterventions(p => p.map(i => i.id === id ? { ...i, ...updates } : i))
    try {
      const updated = await api.put(`/interventions/${id}`, updates)
      setInterventions(p => p.map(i => i.id === id ? updated : i))
    } catch (err) {
      setInterventions(prev)
      throw err
    }
  }, [])

  const closeIntervention = useCallback(async (id, closeData) => {
    const prevInterventions = interventionsRef.current
    const prevDevices = [...devices]
    const prevWarehouse = [...warehouse]

    // Optimistic updates (mirror current logic)
    setInterventions(p => p.map(i =>
      i.id === id ? { ...i, status: 'completed', closedAt: new Date().toISOString(), ...closeData } : i
    ))

    const intervention = interventionsRef.current.find(i => i.id === id)
    if (closeData.healthPost && intervention?.deviceId) {
      setDevices(p => p.map(d =>
        d.id === intervention.deviceId ? { ...d, healthScore: closeData.healthPost } : d
      ))
    }

    if (closeData.partsUsed?.length > 0) {
      setWarehouse(p => p.map(w => {
        const used = closeData.partsUsed.find(part => part.code === w.code)
        if (used) return { ...w, qty: Math.max(0, w.qty - used.qty) }
        return w
      }))
    }

    try {
      await api.post(`/interventions/${id}/close`, {
        ...closeData,
        deviceId: intervention?.deviceId,
      })

      // Re-fetch affected entities for consistency
      const [intData, devData, whData, notifData] = await Promise.all([
        api.get('/interventions'),
        api.get('/devices'),
        api.get('/warehouse'),
        api.get('/notifications'),
      ])
      setInterventions(intData)
      setDevices(devData)
      setWarehouse(whData)
      setNotifications(notifData)
    } catch (err) {
      // Rollback
      setInterventions(prevInterventions)
      setDevices(prevDevices)
      setWarehouse(prevWarehouse)
      throw err
    }
  }, [devices, warehouse])

  // --- Devices CRUD ---
  const addDevice = useCallback(async (device) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...device, id: tempId, createdAt: new Date().toISOString() }
    setDevices(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/devices', device)
      setDevices(prev => prev.map(d => d.id === tempId ? created : d))
      return created
    } catch (err) {
      setDevices(prev => prev.filter(d => d.id !== tempId))
      throw err
    }
  }, [])

  const updateDevice = useCallback(async (id, updates) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    try {
      const updated = await api.put(`/devices/${id}`, updates)
      setDevices(prev => prev.map(d => d.id === id ? updated : d))
    } catch (err) {
      const fresh = await api.get('/devices')
      setDevices(fresh)
      throw err
    }
  }, [])

  // --- Warehouse CRUD ---
  const addWarehouseItem = useCallback(async (item) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...item, id: tempId }
    setWarehouse(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/warehouse', item)
      setWarehouse(prev => prev.map(w => w.id === tempId ? created : w))
      return created
    } catch (err) {
      setWarehouse(prev => prev.filter(w => w.id !== tempId))
      throw err
    }
  }, [])

  const updateWarehouseItem = useCallback(async (id, updates) => {
    setWarehouse(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    try {
      const updated = await api.put(`/warehouse/${id}`, updates)
      setWarehouse(prev => prev.map(w => w.id === id ? updated : w))
    } catch (err) {
      const fresh = await api.get('/warehouse')
      setWarehouse(fresh)
      throw err
    }
  }, [])

  // --- Contracts CRUD ---
  const addContract = useCallback(async (contract) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...contract, id: tempId }
    setContracts(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/contracts', contract)
      setContracts(prev => prev.map(c => c.id === tempId ? created : c))
      return created
    } catch (err) {
      setContracts(prev => prev.filter(c => c.id !== tempId))
      throw err
    }
  }, [])

  const updateContract = useCallback(async (id, updates) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    try {
      const updated = await api.put(`/contracts/${id}`, updates)
      setContracts(prev => prev.map(c => c.id === id ? updated : c))
    } catch (err) {
      const fresh = await api.get('/contracts')
      setContracts(fresh)
      throw err
    }
  }, [])

  // --- Offers CRUD ---
  const addOffer = useCallback(async (offer) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...offer, id: tempId }
    setOffers(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/offers', offer)
      setOffers(prev => prev.map(o => o.id === tempId ? created : o))
      return created
    } catch (err) {
      setOffers(prev => prev.filter(o => o.id !== tempId))
      throw err
    }
  }, [])

  const updateOffer = useCallback(async (id, updates) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
    try {
      const updated = await api.put(`/offers/${id}`, updates)
      setOffers(prev => prev.map(o => o.id === id ? updated : o))
    } catch (err) {
      const fresh = await api.get('/offers')
      setOffers(fresh)
      throw err
    }
  }, [])

  const acceptOffer = useCallback(async (id) => {
    setOffers(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'accepted', acceptedAt: new Date().toISOString() } : o
    ))
    try {
      const updated = await api.post(`/offers/${id}/accept`)
      setOffers(prev => prev.map(o => o.id === id ? updated : o))
    } catch (err) {
      const fresh = await api.get('/offers')
      setOffers(fresh)
      throw err
    }
  }, [])

  const declineOffer = useCallback(async (id) => {
    setOffers(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'declined' } : o
    ))
    try {
      const updated = await api.post(`/offers/${id}/decline`)
      setOffers(prev => prev.map(o => o.id === id ? updated : o))
    } catch (err) {
      const fresh = await api.get('/offers')
      setOffers(fresh)
      throw err
    }
  }, [])

  // --- Maintenance CRUD ---
  const addMaintenance = useCallback(async (m) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...m, id: tempId }
    setSchedMaint(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/maintenance', m)
      setSchedMaint(prev => prev.map(item => item.id === tempId ? created : item))
      return created
    } catch (err) {
      setSchedMaint(prev => prev.filter(item => item.id !== tempId))
      throw err
    }
  }, [])

  const completeMaintenance = useCallback(async (id, notes) => {
    setSchedMaint(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'completed', completedAt: new Date().toISOString(), notes: notes || m.notes } : m
    ))
    try {
      const updated = await api.post(`/maintenance/${id}/complete`, { notes })
      setSchedMaint(prev => prev.map(m => m.id === id ? updated : m))
    } catch (err) {
      const fresh = await api.get('/maintenance')
      setSchedMaint(fresh)
      throw err
    }
  }, [])

  // --- Calendar Events CRUD ---
  const addCalEvent = useCallback(async (event) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...event, id: tempId }
    setCalEvents(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/calendar', event)
      setCalEvents(prev => prev.map(e => e.id === tempId ? created : e))
      return created
    } catch (err) {
      setCalEvents(prev => prev.filter(e => e.id !== tempId))
      throw err
    }
  }, [])

  const updateCalEvent = useCallback(async (id, updates) => {
    setCalEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    try {
      const updated = await api.put(`/calendar/${id}`, updates)
      setCalEvents(prev => prev.map(e => e.id === id ? updated : e))
    } catch (err) {
      const fresh = await api.get('/calendar')
      setCalEvents(fresh)
      throw err
    }
  }, [])

  const deleteCalEvent = useCallback(async (id) => {
    const prev = calEvents
    setCalEvents(p => p.filter(e => e.id !== id))
    try {
      await api.delete(`/calendar/${id}`)
    } catch (err) {
      setCalEvents(prev)
      throw err
    }
  }, [calEvents])

  // --- Shifts CRUD ---
  const addShift = useCallback(async (shift) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...shift, id: tempId }
    setShifts(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/shifts', shift)
      setShifts(prev => prev.map(s => s.id === tempId ? created : s))
      return created
    } catch (err) {
      setShifts(prev => prev.filter(s => s.id !== tempId))
      throw err
    }
  }, [])

  // --- Notifications ---
  const addNotification = useCallback(async (notif) => {
    const tempId = crypto.randomUUID()
    const optimistic = {
      ...notif,
      id: tempId,
      isRead: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    }
    setNotifications(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/notifications', notif)
      setNotifications(prev => prev.map(n => n.id === tempId ? created : n))
      return created
    } catch (err) {
      setNotifications(prev => prev.filter(n => n.id !== tempId))
      throw err
    }
  }, [])

  const markNotificationRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await api.put(`/notifications/${id}`, { isRead: true })
    } catch {}
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await api.post('/notifications/mark-all-read')
    } catch {}
  }, [])

  const toggleNotificationPin = useCallback(async (id) => {
    const notif = notifications.find(n => n.id === id)
    const newPinned = !notif?.isPinned
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isPinned: newPinned } : n))
    try {
      await api.put(`/notifications/${id}`, { isPinned: newPinned })
    } catch {}
  }, [notifications])

  const deleteNotification = useCallback(async (id) => {
    const prev = notifications
    setNotifications(p => p.filter(n => n.id !== id))
    try {
      await api.delete(`/notifications/${id}`)
    } catch (err) {
      setNotifications(prev)
    }
  }, [notifications])

  // --- Equipment CRUD ---
  const updateEquipment = useCallback(async (id, updates) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    try {
      const updated = await api.put(`/equipment/${id}`, updates)
      setEquipment(prev => prev.map(e => e.id === id ? updated : e))
    } catch (err) {
      const fresh = await api.get('/equipment')
      setEquipment(fresh)
      throw err
    }
  }, [])

  // --- Attachments ---
  const addAttachment = useCallback(async (att) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...att, id: tempId, createdAt: new Date().toISOString() }
    setAttachments(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/attachments', att)
      setAttachments(prev => prev.map(a => a.id === tempId ? created : a))
      return created
    } catch (err) {
      setAttachments(prev => prev.filter(a => a.id !== tempId))
      throw err
    }
  }, [])

  // --- Activity Log ---
  const logActivity = useCallback(async (entry) => {
    const tempId = crypto.randomUUID()
    const optimistic = { ...entry, id: tempId, createdAt: new Date().toISOString() }
    setActivityLog(prev => [optimistic, ...prev])
    try {
      const created = await api.post('/activity-log', entry)
      setActivityLog(prev => prev.map(l => l.id === tempId ? created : l))
    } catch {}
  }, [])

  // Unread notifications count
  const unreadCount = notifications.filter(n => !n.isRead).length

  const value = {
    // Data
    devices, interventions, warehouse, contracts, offers,
    schedMaint, calEvents, shifts, notifications, equipment,
    fleet, attachments, activityLog, unreadCount,
    // Loading state
    loading, error,
    // Interventions
    addIntervention, updateIntervention, closeIntervention,
    // Devices
    addDevice, updateDevice,
    // Warehouse
    addWarehouseItem, updateWarehouseItem,
    // Contracts
    addContract, updateContract,
    // Offers
    addOffer, updateOffer, acceptOffer, declineOffer,
    // Maintenance
    addMaintenance, completeMaintenance,
    // Calendar
    addCalEvent, updateCalEvent, deleteCalEvent,
    // Shifts
    addShift,
    // Notifications
    addNotification, markNotificationRead, markAllNotificationsRead,
    toggleNotificationPin, deleteNotification,
    // Equipment
    updateEquipment,
    // Attachments
    addAttachment,
    // Activity
    logActivity,
  }

  return <GlobalStoreContext.Provider value={value}>{children}</GlobalStoreContext.Provider>
}

export function useGlobalStore() {
  const ctx = useContext(GlobalStoreContext)
  if (!ctx) throw new Error('useGlobalStore must be used within GlobalStoreProvider')
  return ctx
}
