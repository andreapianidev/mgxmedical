import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { useToast } from '../../contexts/ToastContext'
import SectionHeader from '../shared/SectionHeader'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Clock } from 'lucide-react'

// ---------------------------------------------------------------------------
// Event type configuration
// ---------------------------------------------------------------------------
const EVENT_TYPES = {
  intervention: { color: '#3B82F6', label: 'Intervento' },
  pm:           { color: '#22C55E', label: 'Manutenzione Prev.' },
  standby:      { color: '#A855F7', label: 'Reperibilita' },
  alert:        { color: '#EF4444', label: 'Allerta' },
  other:        { color: '#94A3B8', label: 'Altro' },
}

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}))

const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// ---------------------------------------------------------------------------
// Blank event factory
// ---------------------------------------------------------------------------
const blankEvent = (dateStr) => ({
  title: '',
  eventType: 'intervention',
  eventDate: dateStr || '',
  startTime: '09:00',
  endTime: '10:00',
  color: EVENT_TYPES.intervention.color,
})

export default function CalendarModuleV2() {
  const { calEvents, addCalEvent, updateCalEvent, deleteCalEvent } = useGlobalStore()
  const { addToast } = useToast()

  // --- State ---
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [formModal, setFormModal] = useState({ open: false, event: null, isEdit: false })

  // --- Calendar grid computation ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  // --- Events indexed by date string ---
  const eventsByDate = useMemo(() => {
    const map = {}
    calEvents.forEach(evt => {
      const key = evt.eventDate
      if (!map[key]) map[key] = []
      map[key].push(evt)
    })
    return map
  }, [calEvents])

  // --- Events for selected day ---
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return (eventsByDate[key] || []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [selectedDay, eventsByDate])

  // --- Navigation handlers ---
  const goNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
  const goPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const goToday = () => {
    setCurrentMonth(new Date())
    setSelectedDay(new Date())
  }

  // --- Form handlers ---
  const openAddForm = () => {
    const dateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setFormModal({ open: true, event: blankEvent(dateStr), isEdit: false })
  }

  const openEditForm = (evt) => {
    setFormModal({ open: true, event: { ...evt }, isEdit: true })
  }

  const closeForm = () => setFormModal({ open: false, event: null, isEdit: false })

  const handleFormChange = (field, value) => {
    setFormModal(prev => ({
      ...prev,
      event: {
        ...prev.event,
        [field]: value,
        // Auto-sync color when eventType changes
        ...(field === 'eventType' ? { color: EVENT_TYPES[value]?.color || '#94A3B8' } : {}),
      },
    }))
  }

  const handleSave = async () => {
    const evt = formModal.event
    if (!evt.title.trim() || !evt.eventDate) return
    try {
      if (formModal.isEdit && evt.id) {
        await updateCalEvent(evt.id, {
          title: evt.title,
          eventType: evt.eventType,
          eventDate: evt.eventDate,
          startTime: evt.startTime,
          endTime: evt.endTime,
          color: evt.color,
        })
      } else {
        await addCalEvent({
          title: evt.title,
          eventType: evt.eventType,
          eventDate: evt.eventDate,
          startTime: evt.startTime,
          endTime: evt.endTime,
          color: evt.color,
        })
      }
    } catch (err) {
      addToast('error', 'Errore durante il salvataggio dell\'evento.')
      return
    }
    closeForm()
  }

  const handleDelete = async (evtId) => {
    try {
      await deleteCalEvent(evtId)
    } catch (err) {
      addToast('error', 'Errore durante l\'eliminazione dell\'evento.')
    }
  }

  // --- Unique event types present in a day (for dots) ---
  const getDayDots = (dateStr) => {
    const events = eventsByDate[dateStr] || []
    const types = [...new Set(events.map(e => e.eventType))]
    return types.slice(0, 4) // max 4 dots
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Calendario"
        subtitle="Pianificazione interventi e manutenzioni"
      >
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Nuovo evento
        </button>
      </SectionHeader>

      {/* Month navigation */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button
            onClick={goPrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h2>
            <button
              onClick={goToday}
              className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            >
              Oggi
            </button>
          </div>
          <button
            onClick={goNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)
            const selected = selectedDay && isSameDay(day, selectedDay)
            const dots = getDayDots(dateStr)

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`relative flex flex-col items-center justify-start py-2 min-h-[72px] border-b border-r border-gray-50 transition-colors
                  ${!inMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-blue-50/30'}
                  ${selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}
                `}
              >
                <span
                  className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${today ? 'bg-blue-600 text-white font-bold' : ''}
                    ${selected && !today ? 'bg-blue-100 text-blue-700' : ''}
                  `}
                >
                  {format(day, 'd')}
                </span>
                {/* Event dots */}
                {dots.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {dots.map((type, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: EVENT_TYPES[type]?.color || '#94A3B8' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day events panel */}
      {selectedDay && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 capitalize">
                {format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 'i' : 'o'}
              </p>
            </div>
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus size={12} />
              Aggiungi
            </button>
          </div>
          <div className="p-4">
            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map(evt => {
                  const typeConf = EVENT_TYPES[evt.eventType] || EVENT_TYPES.other
                  return (
                    <div
                      key={evt.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      style={{ borderLeftWidth: 3, borderLeftColor: typeConf.color }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{evt.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={11} />
                            {evt.startTime} - {evt.endTime}
                          </span>
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: typeConf.color + '18', color: typeConf.color }}
                          >
                            {typeConf.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditForm(evt)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Edit size={14} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                message="Nessun evento"
                description="Non ci sono eventi pianificati per questo giorno"
                action={
                  <button
                    onClick={openAddForm}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={12} />
                    Crea evento
                  </button>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Legenda</p>
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(EVENT_TYPES).map(([key, conf]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: conf.color }}
              />
              <span className="text-xs text-gray-600">{conf.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={closeForm}
        title={formModal.isEdit ? 'Modifica Evento' : 'Nuovo Evento'}
        subtitle={formModal.event?.eventDate ? format(new Date(formModal.event.eventDate + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: it }) : ''}
      >
        {formModal.event && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
              <input
                type="text"
                value={formModal.event.title}
                onChange={e => handleFormChange('title', e.target.value)}
                placeholder="Es. Manutenzione preventiva TAC..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
            </div>

            {/* Event type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento</label>
              <select
                value={formModal.event.eventType}
                onChange={e => handleFormChange('eventType', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
              >
                {EVENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={formModal.event.eventDate}
                onChange={e => handleFormChange('eventDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                <input
                  type="time"
                  value={formModal.event.startTime}
                  onChange={e => handleFormChange('startTime', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine</label>
                <input
                  type="time"
                  value={formModal.event.endTime}
                  onChange={e => handleFormChange('endTime', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
              </div>
            </div>

            {/* Color preview */}
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: formModal.event.color }}
              />
              <span className="text-xs text-gray-500">
                Colore: {EVENT_TYPES[formModal.event.eventType]?.label || 'Personalizzato'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={!formModal.event.title.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  formModal.event.title.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {formModal.isEdit ? 'Salva modifiche' : 'Crea evento'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
