import { useRef, useEffect, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'
import { Eraser } from 'lucide-react'

export default function SignaturePad({ label, value, onChange, disabled = false }) {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Size canvas to container
    const container = containerRef.current
    if (container) {
      canvas.width = container.offsetWidth
      canvas.height = 150
    }

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 0.5,
      maxWidth: 2.5,
    })

    padRef.current = pad

    if (disabled) {
      pad.off()
    }

    // Load existing value
    if (value) {
      pad.fromDataURL(value, { ratio: 1 })
    }

    // Emit on stroke end
    const handleEnd = () => {
      onChange?.(pad.toDataURL('image/png'))
    }
    canvas.addEventListener('pointerup', handleEnd)
    canvas.addEventListener('pointerleave', handleEnd)

    return () => {
      canvas.removeEventListener('pointerup', handleEnd)
      canvas.removeEventListener('pointerleave', handleEnd)
      pad.off()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(() => {
    if (padRef.current) {
      padRef.current.clear()
      onChange?.('')
    }
  }, [onChange])

  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <div
        ref={containerRef}
        className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${disabled ? 'opacity-50' : ''}`}
      >
        <canvas
          ref={canvasRef}
          style={{ touchAction: 'none', width: '100%', height: '150px', display: 'block' }}
          className={disabled ? 'pointer-events-none' : 'cursor-crosshair'}
        />
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Eraser size={12} /> Cancella firma
        </button>
      )}
    </div>
  )
}
