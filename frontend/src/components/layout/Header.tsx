import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Bell, LogOut, Clock, CheckCheck, LayoutDashboard, Layers, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import type { Contrato, Notification } from '../../types'
import { ThemeToggle } from '../ui/ThemeToggle'

import { useToast } from '../../contexts/ToastContext'

interface HeaderProps {
  contratoSelecionado?: number | null
  onSelectContrato?: (id: number | null) => void
  contratos?: Contrato[]
}

export function Header({ contratoSelecionado, onSelectContrato, contratos = [] }: HeaderProps) {
  const { user, logout, isEmpresa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifContainerRef = useRef<HTMLDivElement>(null)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])

  const startAutoCloseTimer = useCallback(() => {
    clearAutoCloseTimer()
    autoCloseTimerRef.current = setTimeout(() => {
      setShowNotifs(false)
    }, 5000)
  }, [clearAutoCloseTimer])

  useEffect(() => {
    if (!showNotifs) {
      clearAutoCloseTimer()
      return
    }

    // Inicia contagem regressiva de 5 segundos quando o menu abre
    startAutoCloseTimer()

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setShowNotifs(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifs(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearAutoCloseTimer()
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showNotifs, startAutoCloseTimer, clearAutoCloseTimer])

  const activeContratoId =
    contratoSelecionado !== undefined
      ? contratoSelecionado
      : searchParams.get('contrato')
      ? Number(searchParams.get('contrato'))
      : null

  const handleContractChange = (newId: number | null) => {
    if (onSelectContrato) {
      onSelectContrato(newId)
    }
    const newParams = new URLSearchParams(searchParams)
    if (newId) {
      newParams.set('contrato', String(newId))
    } else {
      newParams.delete('contrato')
    }
    setSearchParams(newParams)
  }

  const { data: rawNotifs } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: clientService.notificacoes.list,
    refetchInterval: 5000,
  })

  const notificacoes: Notification[] = Array.isArray(rawNotifs) ? rawNotifs : []
  const naoLidas = notificacoes.filter((n) => !n.lida)
  const listaContratos: Contrato[] = Array.isArray(contratos) ? contratos : []

  const marcarLidaMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarLida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  })

  const marcarTodasMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarTodasLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      toast.success('Todas as notificações foram marcadas como lidas.', 'Notificações')
    },
  })

  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  const userInitials = (user?.first_name ? user.first_name[0] : user?.username?.[0] || 'U').toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to={isEmpresa ? (activeContratoId ? `/admin/dashboard?contrato=${activeContratoId}` : "/admin/dashboard") : (activeContratoId ? `/dashboard?contrato=${activeContratoId}` : "/dashboard")}
            className="flex items-center gap-2.5 font-black text-xl text-slate-900 dark:text-white tracking-tight group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">SHM</span>
          </Link>

          {/* Live Session & Version Indicator */}
          <div
            title="Versão ao vivo: Main Release 2.1 (A2 & A3 Magic Link com Auditoria Forense)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shadow-2xs cursor-default"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-500"></span>
            </span>
            <span>Main Release 2.1</span>
          </div>

          {/* Empresa Navigation Switcher */}
          {isEmpresa && (
            <nav className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0">
              <Link
                to={activeContratoId ? `/dashboard?contrato=${activeContratoId}` : "/dashboard"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  !location.pathname.startsWith('/admin')
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visão Kanban</span>
              </Link>
              <Link
                to={activeContratoId ? `/admin/dashboard?contrato=${activeContratoId}` : "/admin/dashboard"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Painel Operacional</span>
              </Link>
            </nav>
          )}

          {listaContratos.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
              <span className="hidden md:inline text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
                Contrato:
              </span>
              <select
                value={activeContratoId || ''}
                onChange={(e) => handleContractChange(e.target.value ? Number(e.target.value) : null)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer w-auto min-w-[260px] sm:min-w-[300px] max-w-[460px]"
              >
                <option value="">Todos os Contratos ({listaContratos.length})</option>
                {listaContratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} {c.cliente_nome ? `— ${c.cliente_nome}` : ''} ({Number(c.saldo).toFixed(1)}h)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Light Mode / Dark Mode Switch */}
          <div className="flex items-center">
            <ThemeToggle size="sm" />
          </div>

          {/* Notificações Dropdown */}
          <div
            ref={notifContainerRef}
            onMouseEnter={clearAutoCloseTimer}
            onMouseLeave={() => {
              if (showNotifs) startAutoCloseTimer()
            }}
            onFocus={clearAutoCloseTimer}
            onBlur={(e) => {
              if (showNotifs && !notifContainerRef.current?.contains(e.relatedTarget as Node)) {
                startAutoCloseTimer()
              }
            }}
            className="relative"
          >
            <button
              onClick={() => setShowNotifs((prev) => !prev)}
              className="relative p-2.5 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              title="Notificações"
              aria-expanded={showNotifs}
            >
              <Bell className="w-5 h-5" />
              {naoLidas.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {naoLidas.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-slate-900/10">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Notificações</span>
                    {naoLidas.length > 0 && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                        {naoLidas.length} novas
                      </span>
                    )}
                  </div>
                  {naoLidas.length > 0 && (
                    <button
                      disabled={marcarTodasMutation.isPending}
                      onClick={() => marcarTodasMutation.mutate()}
                      className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      {marcarTodasMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Lendo todas...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Ler todas</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {notificacoes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">Nenhuma notificação registrada.</div>
                  ) : (
                    notificacoes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.lida) marcarLidaMutation.mutate(n.id)
                          if (n.url) navigate(n.url)
                          setShowNotifs(false)
                        }}
                        className={`p-3.5 text-xs cursor-pointer transition ${
                          n.lida
                            ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 font-medium text-slate-900 dark:text-white border-l-4 border-indigo-600'
                        }`}
                      >
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 mb-0.5">{n.titulo}</div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{n.mensagem}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-300 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {user?.avatar_url && !avatarError ? (
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-xs ring-2 ring-white dark:ring-slate-800 border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <img
                    src={user.avatar_url}
                    alt={user?.first_name || user?.username || 'Foto de Perfil'}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-800 shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name || user?.username}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-tight">
                  {user?.role_display?.split('—')[0] || user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Encerrar Sessão"
              className="p-2 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100/80 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}