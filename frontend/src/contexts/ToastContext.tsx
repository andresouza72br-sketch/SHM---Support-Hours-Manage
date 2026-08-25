import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  title?: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message, title }])

    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }, [removeToast])

  const success = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title)
  }, [showToast])

  const error = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title)
  }, [showToast])

  const info = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Floating Toasts Container */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 max-w-md w-[calc(100%-2rem)] sm:w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 relative overflow-hidden ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40 ring-1 ring-rose-500/30'
                : 'bg-slate-900/90 border-indigo-500/40 text-slate-100 shadow-slate-950/40 ring-1 ring-indigo-500/30'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
            </div>

            <div className="flex-1 space-y-0.5">
              {t.title && <div className="text-xs font-black tracking-wide">{t.title}</div>}
              <p className="text-xs font-semibold leading-snug">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* 3-Second Visual Countdown Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 ${
                t.type === 'success'
                  ? 'bg-emerald-400/80'
                  : t.type === 'error'
                  ? 'bg-rose-400/80'
                  : 'bg-indigo-400/80'
              }`}
              style={{
                animation: 'toastCountdown 3000ms linear forwards',
              }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
