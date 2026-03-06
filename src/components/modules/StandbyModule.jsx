import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import { DEMO_USERS } from '../../data/demoData'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks,
  format, isSameDay, isToday,
} from 'date-fns'
import { it } from 'date-fns/locale'
import SectionHeader from '../shared/SectionHeader'
import Modal from '../shared/Modal'
import { Moon, Sun, Plus, Phone, ChevronLeft, ChevronRight, User, Clock, Edit, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SHIFT_TYPES = {
  standby: { label: 'Reperibilita', icon: Moon, color: '#8E44AD', bg: '#F5EEF8' },
  day:     { label: 'Turno diurno', icon: Sun,  color: '#F1C40F', bg: '#FEF9E7' },
}
const TECHNICIANS = DEMO_USERS.filter(u => u.role === 'technician')

export default function StandbyModule() {
  const { shifts, addShift, updateShift, deleteShift } = useGlobalStore()
  const { addToast } = useToast()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    techId: TECHNICIANS[0]?.id || '',
    shiftType: 'standby',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '17:00',
  })

  // --- Week boundaries ---
  const baseDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset])
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  )

  // --- Today's on-duty tech ---
  const todayShift = useMemo(
    () => shifts.find(s => isSameDay(new Date(s.shiftDate), new Date())),
    [shifts],
  )
  const onDutyTech = todayShift
    ? DEMO_USERS.find(u => u.id === todayShift.techId) || {
        name: todayShift.techName,
        avatar: todayShift.techName?.split(' ').map(w => w[0]).join('').toUpperCase(),
        color: '#2E86C1',
      }
    : null

  // --- Shifts for displayed week ---
  const weekShifts = useMemo(
    () => shifts.filter(s => {
      const d = new Date(s.shiftDate)
      return d >= weekStart && d <= weekEnd
    }),
    [shifts, weekStart, weekEnd],
  )

  // --- Stats ---
  const shiftsByTech = useMemo(() => {
    const map = {}
    weekShifts.forEach(s => {
      const name = s.techName || 'Sconosciuto'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [weekShifts])

  // --- Handlers ---
  const handleFormChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({ techId: TECHNICIANS[0]?.id || '', shiftType: 'standby', date: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00', endTime: '17:00' })
    setEditingShift(null)
  }

  const handleSaveShift = async () => {
    const tech = TECHNICIANS.find(t => t.id === form.techId)
    if (!tech) return
    const shiftData = {
      techId: tech.id, techName: tech.name, shiftType: form.shiftType,
      shiftDate: form.date, startTime: form.startTime, endTime: form.endTime,
    }
    try {
      if (editingShift) {
        await updateShift(editingShift.id, shiftData)
        addToast('success', 'Turno aggiornato con successo')
      } else {
        await addShift(shiftData)
        addToast('success', 'Turno creato con successo')
      }
    } catch {
      addToast('error', editingShift ? 'Errore nell\'aggiornamento del turno' : 'Errore nella creazione del turno')
    }
    setShowAddModal(false)
    resetForm()
  }

  const openEditShift = (shift) => {
    setEditingShift(shift)
    setForm({
      techId: shift.techId || TECHNICIANS[0]?.id || '',
      shiftType: shift.shiftType || 'standby',
      date: shift.shiftDate ? format(new Date(shift.shiftDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '17:00',
    })
    setShowAddModal(true)
  }

  const handleDeleteShift = async () => {
    if (!deleteTarget) return
    try {
      await deleteShift(deleteTarget.id)
      addToast('success', 'Turno eliminato con successo')
    } catch {
      addToast('error', 'Errore nell\'eliminazione del turno')
    }
    setDeleteTarget(null)
  }

  const getShiftForDayType = (day, type) =>
    weekShifts.filter(s => isSameDay(new Date(s.shiftDate), day) && s.shiftType === type)

  return (
    <div className="space-y-6">
      <SectionHeader title="Reperibilita" subtitle="Gestione turni e reperibilita tecnici">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Nuovo Turno
        </button>
      </SectionHeader>

      {/* ON DUTY NOW */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Clock size={14} /> In turno adesso
        </h2>
        {onDutyTech ? (
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
              style={{ backgroundColor: onDutyTech.color || '#2E86C1' }}
            >
              {onDutyTech.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-800">{onDutyTech.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: SHIFT_TYPES[todayShift.shiftType]?.bg, color: SHIFT_TYPES[todayShift.shiftType]?.color }}
                >
                  {todayShift.shiftType === 'standby' ? <Moon size={11} /> : <Sun size={11} />}
                  {SHIFT_TYPES[todayShift.shiftType]?.label}
                </span>
                <span className="text-xs text-gray-400">{todayShift.startTime} - {todayShift.endTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addToast('info', `Chiamata a ${onDutyTech.name} — funzionalità in arrivo`)}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <Phone size={14} /> Chiama
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-400 py-2">
            <User size={20} />
            <p className="text-sm">Nessun tecnico in turno oggi</p>
          </div>
        )}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h3 className="text-sm font-semibold text-gray-700">
          {format(weekStart, 'd MMM', { locale: it })} — {format(weekEnd, 'd MMM yyyy', { locale: it })}
        </h3>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-36">Tipo Turno</th>
                {weekDays.map(day => (
                  <th
                    key={day.toISOString()}
                    className={`px-2 py-2.5 text-center text-xs font-semibold ${isToday(day) ? 'text-blue-700 bg-blue-50' : 'text-gray-500'}`}
                  >
                    <p>{format(day, 'EEE', { locale: it })}</p>
                    <p className="text-sm font-bold mt-0.5">{format(day, 'd')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(SHIFT_TYPES).map(([type, cfg]) => (
                <tr key={type}>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
                      <cfg.icon size={14} /> {cfg.label}
                    </span>
                  </td>
                  {weekDays.map(day => {
                    const dayShifts = getShiftForDayType(day, type)
                    return (
                      <td key={day.toISOString()} className={`px-2 py-3 text-center ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                        {dayShifts.length > 0 ? (
                          dayShifts.map(s => (
                            <div
                              key={s.id}
                              className="group relative inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium mb-0.5"
                              style={{ backgroundColor: cfg.bg, color: cfg.color }}
                            >
                              <span>{s.techName?.split(' ')[0]}</span>
                              <div className="hidden group-hover:inline-flex items-center gap-0.5 ml-0.5">
                                <button
                                  onClick={() => openEditShift(s)}
                                  className="p-0.5 rounded hover:bg-white/40 transition-colors"
                                  title="Modifica"
                                >
                                  <Edit size={10} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(s)}
                                  className="p-0.5 rounded hover:bg-red-200/50 transition-colors"
                                  title="Elimina"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Totale turni settimana</h3>
          <p className="text-3xl font-bold text-gray-800">{weekShifts.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {format(weekStart, 'd MMM', { locale: it })} — {format(weekEnd, 'd MMM', { locale: it })}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Distribuzione per tecnico</h3>
          {shiftsByTech.length > 0 ? (
            <div className="space-y-2">
              {shiftsByTech.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 flex items-center gap-1.5">
                    <User size={13} className="text-gray-400" /> {name}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{count} turni</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nessun turno in questa settimana</p>
          )}
        </div>
      </div>

      {/* Add Shift Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm() }} title={editingShift ? 'Modifica Turno' : 'Nuovo Turno'} subtitle={editingShift ? 'Modifica i dati del turno' : 'Assegna un turno a un tecnico'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico</label>
            <select
              value={form.techId}
              onChange={e => handleFormChange('techId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {TECHNICIANS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo turno</label>
            <div className="flex gap-2">
              {Object.entries(SHIFT_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleFormChange('shiftType', key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    form.shiftType === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <cfg.icon size={14} /> {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={form.date}
              onChange={e => handleFormChange('date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inizio</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => handleFormChange('startTime', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fine</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => handleFormChange('endTime', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => { setShowAddModal(false); resetForm() }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Annulla
            </button>
            <button onClick={handleSaveShift} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              {editingShift ? 'Aggiorna Turno' : 'Salva Turno'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma eliminazione" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sei sicuro di voler eliminare il turno di <strong>{deleteTarget?.techName}</strong> del{' '}
            <strong>{deleteTarget?.shiftDate ? format(new Date(deleteTarget.shiftDate), 'dd/MM/yyyy') : ''}</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Annulla
            </button>
            <button onClick={handleDeleteShift} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              Elimina
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
