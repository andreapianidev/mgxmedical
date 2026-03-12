import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Check, FileText } from 'lucide-react'
import Modal from '../../shared/Modal'
import ChecklistVerifiche from './ChecklistVerifiche'
import WorkSessionsEditor from './WorkSessionsEditor'
import SignatureBlock from './SignatureBlock'
import { FAULT_TYPES } from '../../../lib/constants'

const OUTCOME_OPTIONS = ['Risolto', 'Parziale', 'Escalation']

const EMPTY_SIGNATURE = { role: '', name: '', dataUrl: '' }

function buildInitialState() {
  return {
    healthPost: 75,
    outcome: 'Risolto',
    notes: '',
    faultType: '',
    workPerformed: '',
    rootCause: '',
    checklistVerifiche: {},
    repairInLab: false,
    needsTransfer: false,
    needsSpareParts: false,
    workSessions: [{ date: '', techName: '', workHours: '', travelHours: '' }],
    completionLocation: '',
    calloutFee: 0,
    travelFee: 0,
    signatures: {
      execution: { ...EMPTY_SIGNATURE },
      confirmation: { ...EMPTY_SIGNATURE },
      verification: { ...EMPTY_SIGNATURE },
    },
  }
}

export default function CloseInterventionModal({ intervention, isOpen, onClose, onSubmit, onSubmitAndPdf, warehouse = [] }) {
  const [form, setForm] = useState(buildInitialState)
  const [closeParts, setCloseParts] = useState([])

  // Reset state when intervention changes
  const resetForIntervention = useCallback(() => {
    setForm(buildInitialState())
    setCloseParts(
      warehouse.map(w => ({
        id: w.id,
        code: w.code,
        name: w.name,
        unitCost: w.unitCost,
        qty: 0,
        serialNumber: '',
        selected: false,
      }))
    )
  }, [warehouse])

  // Reset when opening with a new intervention
  const prevIdRef = useRef(null)
  useEffect(() => {
    if (intervention && intervention.id !== prevIdRef.current) {
      prevIdRef.current = intervention.id
      resetForIntervention()
    }
  }, [intervention, resetForIntervention])

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Parts helpers
  const togglePart = (idx) => {
    setCloseParts(prev =>
      prev.map((p, i) =>
        i === idx ? { ...p, selected: !p.selected, qty: !p.selected ? 1 : 0 } : p
      )
    )
  }

  const updatePartQty = (idx, qty) => {
    setCloseParts(prev =>
      prev.map((p, i) => i === idx ? { ...p, qty: Math.max(0, Number(qty)) } : p)
    )
  }

  const updatePartSn = (idx, sn) => {
    setCloseParts(prev =>
      prev.map((p, i) => i === idx ? { ...p, serialNumber: sn } : p)
    )
  }

  const totalPartsCost = useMemo(
    () => closeParts.filter(p => p.selected && p.qty > 0).reduce((sum, p) => sum + p.qty * p.unitCost, 0),
    [closeParts]
  )

  // Health color helper
  const healthColor = (val) => {
    if (val >= 80) return '#27AE60'
    if (val >= 50) return '#F39C12'
    return '#C0392B'
  }

  // Build close data
  const buildCloseData = () => {
    const partsUsed = closeParts
      .filter(p => p.selected && p.qty > 0)
      .map(p => ({ code: p.code, name: p.name, qty: p.qty, unitCost: p.unitCost, serialNumber: p.serialNumber }))

    return {
      ...form,
      partsUsed,
      totalPartsCost: partsUsed.reduce((sum, p) => sum + p.qty * p.unitCost, 0),
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try { await onSubmit(buildCloseData()) } finally { setSubmitting(false) }
  }

  const handleSubmitAndPdf = async () => {
    if (submitting) return
    setSubmitting(true)
    try { await onSubmitAndPdf(buildCloseData()) } finally { setSubmitting(false) }
  }

  // Section divider
  const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-2 pt-3 pb-1 border-t border-gray-100 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-700">{children}</h3>
    </div>
  )

  if (!intervention) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chiudi Intervento ${intervention.code}`}
      subtitle={intervention.deviceName}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* ─── A. ESITO E HEALTH SCORE ─── */}
        <SectionLabel>Esito e Stato Salute</SectionLabel>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Health Score Post-Intervento:{' '}
            <span className="font-bold" style={{ color: healthColor(form.healthPost) }}>
              {form.healthPost}%
            </span>
          </label>
          <input
            type="range" min="0" max="100" value={form.healthPost}
            onChange={e => update('healthPost', Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${healthColor(form.healthPost)} 0%, ${healthColor(form.healthPost)} ${form.healthPost}%, #e5e7eb ${form.healthPost}%, #e5e7eb 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esito</label>
          <select
            value={form.outcome}
            onChange={e => update('outcome', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* ─── B. TIPO DI GUASTO E LAVORO ─── */}
        <SectionLabel>Tipo di Guasto e Lavoro Eseguito</SectionLabel>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Tipo di guasto</label>
          <div className="flex flex-wrap gap-2">
            {FAULT_TYPES.map(ft => (
              <button
                key={ft}
                type="button"
                onClick={() => update('faultType', form.faultType === ft ? '' : ft)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${form.faultType === ft
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lavoro eseguito</label>
          <textarea
            rows={3}
            value={form.workPerformed}
            onChange={e => update('workPerformed', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            placeholder="Descrizione dettagliata del lavoro svolto..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Causa</label>
          <textarea
            rows={2}
            value={form.rootCause}
            onChange={e => update('rootCause', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            placeholder="Causa del guasto / problema riscontrato..."
          />
        </div>

        {/* ─── C. CHECKLIST VERIFICHE ─── */}
        <SectionLabel>Controlli e Verifiche</SectionLabel>
        <ChecklistVerifiche
          value={form.checklistVerifiche}
          onChange={v => update('checklistVerifiche', v)}
        />

        {/* ─── D. STATO RIPARAZIONE ─── */}
        <SectionLabel>Stato Riparazione</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'repairInLab', label: 'Riparazione in laboratorio' },
            { key: 'needsTransfer', label: 'Necessita trasferimenti' },
            { key: 'needsSpareParts', label: 'Necessita ricambi' },
          ].map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
              ${form[key] ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={e => update(key, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* ─── E. RICAMBI UTILIZZATI ─── */}
        <SectionLabel>Ricambi / Materiali Utilizzati</SectionLabel>
        <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
          {closeParts.map((part, idx) => (
            <div
              key={part.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${part.selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <input
                type="checkbox"
                checked={part.selected}
                onChange={() => togglePart(idx)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate">{part.name}</div>
                <div className="text-xs text-gray-400">{part.code} - EUR {part.unitCost.toFixed(2)}/pz</div>
              </div>
              {part.selected && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="text"
                    value={part.serialNumber}
                    onChange={e => updatePartSn(idx, e.target.value)}
                    placeholder="S/N"
                    className="w-20 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <label className="text-xs text-gray-500">Qty:</label>
                  <input
                    type="number"
                    min="0"
                    value={part.qty}
                    onChange={e => updatePartQty(idx, e.target.value)}
                    className="w-14 px-1.5 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <span className="text-xs text-gray-500 w-20 text-right">
                    EUR {(part.qty * part.unitCost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        {totalPartsCost > 0 && (
          <div className="text-right text-sm font-semibold text-gray-700 mt-1">
            Totale ricambi: <span className="text-blue-700">EUR {totalPartsCost.toFixed(2)}</span>
          </div>
        )}

        {/* ─── F. SESSIONI DI LAVORO ─── */}
        <SectionLabel>Dati Intervento</SectionLabel>
        <WorkSessionsEditor
          sessions={form.workSessions}
          onChange={v => update('workSessions', v)}
        />

        {/* ─── G. DATI COMPLETAMENTO ─── */}
        <SectionLabel>Completamento</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Luogo fine intervento</label>
            <input
              type="text"
              value={form.completionLocation}
              onChange={e => update('completionLocation', e.target.value)}
              placeholder="Es. presso struttura"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Diritto di chiamata (EUR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.calloutFee}
              onChange={e => update('calloutFee', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Trasferta (EUR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.travelFee}
              onChange={e => update('travelFee', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* ─── H. NOTE TECNICHE ─── */}
        <SectionLabel>Note Tecniche</SectionLabel>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          placeholder="Note sull'intervento eseguito..."
        />

        {/* ─── I. FIRME ─── */}
        <SectionLabel>Firme</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SignatureBlock
            label="Esecuzione intervento"
            signature={form.signatures.execution}
            onChange={v => update('signatures', { ...form.signatures, execution: v })}
          />
          <SignatureBlock
            label="Conferma esito lavori"
            signature={form.signatures.confirmation}
            onChange={v => update('signatures', { ...form.signatures, confirmation: v })}
          />
          <SignatureBlock
            label="Verifica lavori"
            signature={form.signatures.verification}
            onChange={v => update('signatures', { ...form.signatures, verification: v })}
          />
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={15} /> {submitting ? 'Chiusura...' : 'Chiudi Intervento'}
          </button>
          <button
            onClick={handleSubmitAndPdf}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={15} /> {submitting ? 'Chiusura...' : 'Chiudi e Genera PDF'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
