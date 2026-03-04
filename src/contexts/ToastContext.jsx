import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    borderColor: '#22c55e',
    bgColor: '#f0fdf4',
    iconColor: '#16a34a',
    textColor: '#15803d',
  },
  error: {
    icon: XCircle,
    borderColor: '#ef4444',
    bgColor: '#fef2f2',
    iconColor: '#dc2626',
    textColor: '#b91c1c',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: '#f97316',
    bgColor: '#fff7ed',
    iconColor: '#ea580c',
    textColor: '#c2410c',
  },
  info: {
    icon: Info,
    borderColor: '#3b82f6',
    bgColor: '#eff6ff',
    iconColor: '#2563eb',
    textColor: '#1d4ed8',
  },
}

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
    )
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const addToast = useCallback((type, message, duration = 3000) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, type, message, duration, exiting: false }])
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }, [removeToast])

  useEffect(() => {
    const currentTimers = timersRef.current
    return () => {
      Object.values(currentTimers).forEach(clearTimeout)
    }
  }, [])

  const value = {
    toasts,
    addToast,
    removeToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '0.75rem',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
          const IconComponent = config.icon

          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                minWidth: '320px',
                maxWidth: '420px',
                padding: '0.875rem 1rem',
                backgroundColor: config.bgColor,
                borderLeft: `4px solid ${config.borderColor}`,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
                pointerEvents: 'auto',
                animation: toast.exiting
                  ? 'toastSlideOut 0.3s ease-in forwards'
                  : 'toastSlideIn 0.3s ease-out forwards',
              }}
            >
              <IconComponent
                size={20}
                style={{ color: config.iconColor, flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: config.textColor,
                  lineHeight: 1.4,
                }}
              >
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '0.25rem',
                  color: config.textColor,
                  opacity: 0.6,
                  flexShrink: 0,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
                aria-label="Chiudi notifica"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
