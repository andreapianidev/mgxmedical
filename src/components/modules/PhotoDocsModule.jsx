import { useState, useMemo } from 'react'
import { useGlobalStore } from '../../contexts/GlobalStoreContext'
import { formatDateTime } from '../../lib/utils'
import SectionHeader from '../shared/SectionHeader'
import SearchBar from '../shared/SearchBar'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import StatusChip from '../shared/StatusChip'
import { Camera, Upload, Image, FileText, ChevronLeft, ChevronRight, X, Download, Eye } from 'lucide-react'

const PHASE_COLORS = {
  PRE:       { bg: '#FADBD8', color: '#C0392B', label: 'PRE' },
  DURANTE:   { bg: '#D6EAF8', color: '#2E86C1', label: 'DURANTE' },
  POST:      { bg: '#D5F5E3', color: '#27AE60', label: 'POST' },
  DOCUMENTI: { bg: '#E8DAEF', color: '#8E44AD', label: 'DOCUMENTI' },
}

const PHASE_TABS = ['Tutte', 'PRE', 'DURANTE', 'POST', 'DOCUMENTI']

export default function PhotoDocsModule() {
  const { attachments, interventions, addAttachment } = useGlobalStore()

  const [search, setSearch] = useState('')
  const [selectedIntId, setSelectedIntId] = useState(null)
  const [phaseTab, setPhaseTab] = useState('Tutte')
  const [lightbox, setLightbox] = useState({ open: false, index: 0 })
  const [uploadPhase, setUploadPhase] = useState('PRE')

  // Interventions that have at least one attachment
  const interventionsWithAttachments = useMemo(() => {
    const attByInt = {}
    attachments.forEach(a => {
      if (!attByInt[a.interventionId]) attByInt[a.interventionId] = 0
      attByInt[a.interventionId]++
    })
    return interventions
      .filter(i => attByInt[i.id])
      .map(i => ({ ...i, attachmentCount: attByInt[i.id] }))
  }, [attachments, interventions])

  // Filtered sidebar list
  const filteredInterventions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return interventionsWithAttachments
    return interventionsWithAttachments.filter(i =>
      i.code?.toLowerCase().includes(q) || i.deviceName?.toLowerCase().includes(q)
    )
  }, [interventionsWithAttachments, search])

  // Attachments for selected intervention, filtered by phase
  const filteredAttachments = useMemo(() => {
    if (!selectedIntId) return []
    let list = attachments.filter(a => a.interventionId === selectedIntId)
    if (phaseTab !== 'Tutte') list = list.filter(a => a.phase === phaseTab)
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [attachments, selectedIntId, phaseTab])

  // Lightbox navigation
  const openLightbox = (idx) => setLightbox({ open: true, index: idx })
  const closeLightbox = () => setLightbox({ open: false, index: 0 })
  const goLightbox = (dir) => {
    setLightbox(prev => {
      const next = prev.index + dir
      if (next < 0 || next >= filteredAttachments.length) return prev
      return { ...prev, index: next }
    })
  }

  const currentAtt = filteredAttachments[lightbox.index] || null
  const selectedInt = interventions.find(i => i.id === selectedIntId)

  return (
    <div className="space-y-6">
      <SectionHeader title="Foto & Documentazione" subtitle="Documentazione fotografica interventi per fase" />

      <div className="flex gap-4">
        {/* ── Left sidebar ── */}
        <div className="w-1/4 min-w-[220px] bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col max-h-[calc(100vh-220px)]">
          <div className="p-3 border-b border-gray-100">
            <SearchBar value={search} onChange={setSearch} placeholder="Cerca intervento..." />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredInterventions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nessun intervento con allegati</p>
            ) : (
              filteredInterventions.map(i => (
                <button
                  key={i.id}
                  onClick={() => { setSelectedIntId(i.id); setPhaseTab('Tutte') }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    selectedIntId === i.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{i.code}</p>
                  <p className="text-xs text-gray-500 truncate">{i.deviceName}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {i.attachmentCount} file
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 space-y-4">
          {/* Phase filter tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {PHASE_TABS.map(tab => {
              const pc = PHASE_COLORS[tab]
              const isActive = phaseTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setPhaseTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? `border-current ${pc ? '' : 'text-blue-600 border-blue-600'}`
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={isActive && pc ? { color: pc.color, borderColor: pc.color } : undefined}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {!selectedIntId ? (
            <EmptyState icon={Camera} message="Seleziona un intervento" description="Scegli un intervento dal pannello a sinistra per visualizzare la documentazione fotografica." />
          ) : filteredAttachments.length === 0 ? (
            <EmptyState icon={Image} message="Nessun allegato" description={`Nessun file trovato per la fase "${phaseTab}" in ${selectedInt?.code || ''}.`} />
          ) : (
            /* Attachments grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttachments.map((att, idx) => {
                const pc = PHASE_COLORS[att.phase] || PHASE_COLORS.DOCUMENTI
                const isDoc = att.fileName?.endsWith('.pdf')
                return (
                  <div
                    key={att.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openLightbox(idx)}
                  >
                    <div className="h-1" style={{ backgroundColor: pc.color }} />
                    {/* Thumbnail placeholder */}
                    <div className="h-36 bg-gray-100 flex items-center justify-center">
                      {isDoc
                        ? <FileText size={40} className="text-gray-300" />
                        : <Camera size={40} className="text-gray-300" />
                      }
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{att.fileName}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: pc.bg, color: pc.color }}>
                          {pc.label}
                        </span>
                        <span className="text-xs text-gray-400">{att.techName}</span>
                      </div>
                      <p className="text-xs text-gray-400">{formatDateTime(att.createdAt)}</p>
                      {att.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{att.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upload placeholder */}
          {selectedIntId && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Fase upload:</label>
                <select
                  value={uploadPhase}
                  onChange={e => setUploadPhase(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {Object.keys(PHASE_COLORS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors cursor-pointer">
                <Upload size={32} className="mb-2" />
                <p className="text-sm font-medium">Trascina file qui</p>
                <p className="text-xs mt-1">oppure clicca per selezionare</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox modal ── */}
      <Modal isOpen={lightbox.open} onClose={closeLightbox} maxWidth="max-w-4xl" showClose={false}>
        {currentAtt && (
          <div className="relative">
            {/* Close */}
            <button onClick={closeLightbox} className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
              <X size={20} className="text-white" />
            </button>

            {/* Image placeholder */}
            <div className="h-[50vh] bg-gray-900 rounded-lg flex items-center justify-center">
              {currentAtt.fileName?.endsWith('.pdf')
                ? <FileText size={64} className="text-gray-500" />
                : <Image size={64} className="text-gray-500" />
              }
            </div>

            {/* Navigation arrows */}
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                onClick={() => goLightbox(-1)}
                disabled={lightbox.index === 0}
                className="p-2 bg-black/40 rounded-r-lg text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                onClick={() => goLightbox(1)}
                disabled={lightbox.index === filteredAttachments.length - 1}
                className="p-2 bg-black/40 rounded-l-lg text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* File info */}
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-base font-semibold text-gray-800">{currentAtt.fileName}</p>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: (PHASE_COLORS[currentAtt.phase] || PHASE_COLORS.DOCUMENTI).bg,
                    color: (PHASE_COLORS[currentAtt.phase] || PHASE_COLORS.DOCUMENTI).color,
                  }}
                >
                  {currentAtt.phase}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-medium">{currentAtt.techName}</span> &mdash; {formatDateTime(currentAtt.createdAt)}
              </p>
              {currentAtt.description && (
                <p className="text-sm text-gray-600">{currentAtt.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {lightbox.index + 1} / {filteredAttachments.length}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
