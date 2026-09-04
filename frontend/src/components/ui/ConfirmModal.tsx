import React, { useEffect } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'

export type ConfirmModalVariant = 'danger' | 'warning' | 'primary' | 'success'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmModalVariant
  icon?: React.ComponentType<{ className?: string }>
  isLoading?: boolean
  badge?: string
  children?: React.ReactNode
}

const VARIANT_CONFIGS: Record<
  ConfirmModalVariant,
  {
    headerBg: string
    headerBorder: string
    iconBg: string
    iconColor: string
    confirmBtnBg: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
> = {
  danger: {
    headerBg: 'bg-rose-50 dark:bg-rose-950/40',
    headerBorder: 'border-rose-200 dark:border-rose-900/60',
    iconBg: 'bg-rose-100 dark:bg-rose-900/60',
    iconColor: 'text-rose-600 dark:text-rose-300',
    confirmBtnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/60',
  },
  warning: {
    headerBg: 'bg-amber-50 dark:bg-amber-950/40',
    headerBorder: 'border-amber-200 dark:border-amber-900/60',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60',
    iconColor: 'text-amber-600 dark:text-amber-300',
    confirmBtnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 text-white',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/60',
  },
  primary: {
    headerBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    headerBorder: 'border-indigo-200 dark:border-indigo-900/60',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/60',
    iconColor: 'text-indigo-600 dark:text-indigo-300',
    confirmBtnBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800/60',
  },
  success: {
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    headerBorder: 'border-emerald-200 dark:border-emerald-900/60',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    confirmBtnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-white',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
  },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  icon: Icon = AlertTriangle,
  isLoading = false,
  badge,
  children,
}: ConfirmModalProps) {
  // Fecha no ESC e bloqueia scroll de fundo
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.primary

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`p-5 sm:p-6 ${config.headerBg} border-b ${config.headerBorder} flex items-start justify-between gap-3.5`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2
                id="confirm-modal-title"
                className="text-base font-black text-slate-900 dark:text-white leading-tight"
              >
                {title}
              </h2>
              {badge && (
                <span
                  className={`inline-block font-mono text-[11px] font-bold ${config.badgeText} ${config.badgeBg} px-2 py-0.5 rounded-md border ${config.badgeBorder}`}
                >
                  {badge}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {description && (
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {description}
            </div>
          )}

          {children}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmBtnBg}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
