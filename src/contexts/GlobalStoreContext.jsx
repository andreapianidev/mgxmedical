import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  DEMO_DEVICES, DEMO_INTERVENTIONS, DEMO_WAREHOUSE, DEMO_CONTRACTS,
  DEMO_OFFERS, DEMO_SCHEDULED_MAINTENANCE, DEMO_CALENDAR_EVENTS,
  DEMO_SHIFTS, DEMO_NOTIFICATIONS, DEMO_EQUIPMENT, DEMO_FLEET,
  DEMO_ATTACHMENTS, DEMO_ACTIVITY_LOG
} from '../data/demoData'

const GlobalStoreContext = createContext(null)

export function GlobalStoreProvider({ children }) {
  const [devices, setDevices] = useState(DEMO_DEVICES)
  const [interventions, setInterventions] = useState(DEMO_INTERVENTIONS)
  const [warehouse, setWarehouse] = useState(DEMO_WAREHOUSE)
  const [contracts, setContracts] = useState(DEMO_CONTRACTS)
  const [offers, setOffers] = useState(DEMO_OFFERS)
  const [schedMaint, setSchedMaint] = useState(DEMO_SCHEDULED_MAINTENANCE)
  const [calEvents, setCalEvents] = useState(DEMO_CALENDAR_EVENTS)
  const [shifts, setShifts] = useState(DEMO_SHIFTS)
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS)
  const [equipment, setEquipment] = useState(DEMO_EQUIPMENT)
  const [fleet, setFleet] = useState(DEMO_FLEET)
  const [attachments, setAttachments] = useState(DEMO_ATTACHMENTS)
  const [activityLog, setActivityLog] = useState(DEMO_ACTIVITY_LOG)

  // --- Interventions CRUD ---
  const addIntervention = useCallback((intervention) => {
    const newInt = { ...intervention, id: intervention.id || crypto.randomUUID(), createdAt: new Date().toISOString() }
    setInterventions(prev => [newInt, ...prev])
    // Add notification
    addNotification({
      title: `Nuovo intervento ${newInt.code}`,
      message: `${newInt.deviceName} - ${newInt.structure}`,
      type: 'info',
      severity: 'medium',
      category: 'Interventi',
      relatedId: newInt.id,
    })
    return newInt
  }, [])

  const updateIntervention = useCallback((id, updates) => {
    setInterventions(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }, [])

  const closeIntervention = useCallback((id, closeData) => {
    // Atomic close: update intervention + device health + warehouse + notification
    setInterventions(prev => prev.map(i => {
      if (i.id !== id) return i
      return { ...i, status: 'completed', closedAt: new Date().toISOString(), ...closeData }
    }))

    // Update device health if healthPost provided
    const intervention = interventions.find(i => i.id === id) // use current reference for deviceId
    if (closeData.healthPost && intervention?.deviceId) {
      setDevices(prev => prev.map(d =>
        d.id === intervention.deviceId ? { ...d, healthScore: closeData.healthPost } : d
      ))
    }

    // Deduct warehouse parts
    if (closeData.partsUsed?.length > 0) {
      setWarehouse(prev => prev.map(w => {
        const used = closeData.partsUsed.find(p => p.code === w.code)
        if (used) return { ...w, qty: Math.max(0, w.qty - used.qty) }
        return w
      }))
    }

    // Generate notification
    const intv = interventions.find(i => i.id === id)
    addNotification({
      title: `Intervento ${intv?.code || ''} chiuso`,
      message: `Health: ${closeData.healthPost || '-'}% — Esito: ${closeData.outcome || '-'}`,
      type: 'success',
      severity: 'low',
      category: 'Interventi',
      relatedId: id,
    })
  }, [interventions])

  // --- Devices CRUD ---
  const addDevice = useCallback((device) => {
    const newDev = { ...device, id: device.id || crypto.randomUUID(), createdAt: new Date().toISOString() }
    setDevices(prev => [newDev, ...prev])
    return newDev
  }, [])

  const updateDevice = useCallback((id, updates) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  // --- Warehouse CRUD ---
  const addWarehouseItem = useCallback((item) => {
    const newItem = { ...item, id: item.id || crypto.randomUUID() }
    setWarehouse(prev => [newItem, ...prev])
    return newItem
  }, [])

  const updateWarehouseItem = useCallback((id, updates) => {
    setWarehouse(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
  }, [])

  // --- Contracts CRUD ---
  const addContract = useCallback((contract) => {
    const newC = { ...contract, id: contract.id || crypto.randomUUID() }
    setContracts(prev => [newC, ...prev])
    return newC
  }, [])

  const updateContract = useCallback((id, updates) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [])

  // --- Offers CRUD ---
  const addOffer = useCallback((offer) => {
    const newOff = { ...offer, id: offer.id || crypto.randomUUID() }
    setOffers(prev => [newOff, ...prev])
    return newOff
  }, [])

  const updateOffer = useCallback((id, updates) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
  }, [])

  const acceptOffer = useCallback((id) => {
    setOffers(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'accepted', acceptedAt: new Date().toISOString() } : o
    ))
  }, [])

  const declineOffer = useCallback((id) => {
    setOffers(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'declined' } : o
    ))
  }, [])

  // --- Maintenance CRUD ---
  const addMaintenance = useCallback((m) => {
    const newM = { ...m, id: m.id || crypto.randomUUID() }
    setSchedMaint(prev => [newM, ...prev])
    return newM
  }, [])

  const completeMaintenance = useCallback((id, notes) => {
    setSchedMaint(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'completed', completedAt: new Date().toISOString(), notes: notes || m.notes } : m
    ))
  }, [])

  // --- Calendar Events CRUD ---
  const addCalEvent = useCallback((event) => {
    const newE = { ...event, id: event.id || crypto.randomUUID() }
    setCalEvents(prev => [newE, ...prev])
    return newE
  }, [])

  const updateCalEvent = useCallback((id, updates) => {
    setCalEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const deleteCalEvent = useCallback((id) => {
    setCalEvents(prev => prev.filter(e => e.id !== id))
  }, [])

  // --- Shifts CRUD ---
  const addShift = useCallback((shift) => {
    const newS = { ...shift, id: shift.id || crypto.randomUUID() }
    setShifts(prev => [newS, ...prev])
    return newS
  }, [])

  // --- Notifications ---
  const addNotification = useCallback((notif) => {
    const newN = {
      ...notif,
      id: notif.id || crypto.randomUUID(),
      isRead: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    }
    setNotifications(prev => [newN, ...prev])
    return newN
  }, [])

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [])

  const toggleNotificationPin = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n))
  }, [])

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // --- Equipment CRUD ---
  const updateEquipment = useCallback((id, updates) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  // --- Attachments ---
  const addAttachment = useCallback((att) => {
    const newA = { ...att, id: att.id || crypto.randomUUID(), createdAt: new Date().toISOString() }
    setAttachments(prev => [newA, ...prev])
    return newA
  }, [])

  // --- Activity Log ---
  const logActivity = useCallback((entry) => {
    const newLog = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setActivityLog(prev => [newLog, ...prev])
  }, [])

  // Unread notifications count
  const unreadCount = notifications.filter(n => !n.isRead).length

  const value = {
    // Data
    devices, interventions, warehouse, contracts, offers,
    schedMaint, calEvents, shifts, notifications, equipment,
    fleet, attachments, activityLog, unreadCount,
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
