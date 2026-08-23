import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import type { Contrato } from '../../types'

interface HeaderProps {
  contratoSelecionado?: number | null
  onSelectContrato?: (id: number | null) => void
  contratos?: Contrato[]
}

export function Header({ contratoSelecionado, onSelectContrato, contratos = [] }: HeaderProps) {
  const { user, logout, isEmpresa } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showNotifs, setShowNotifs] = useState(false)

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: clientService.notificacoes.list,
    refetchInterval: 30000,
  })

  const naoLidas = notificacoes.filter((n) => !n.lida)

  const marcarLidaMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarLida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  })

  const marcarTodasMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarTodasLidas,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  })

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to={isEmpresa ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
            <Clock className="w-6 h-6 text-indigo-600" />
            <span>SHM</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">2.0</span>
          </Link>

          {onSelectContrato && contratos.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato:</span>
              <select
                value={contratoSelecionado || ''}
                onChange={(e) => onSelectContrato(e.target.value ? Number(e.target.value) : null)}
                className="text-sm bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os Contratos</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} — Saldo: {c.saldo}h
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition"
            >
              <Bell className="w-5 h-5" />
              {naoLidas.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {naoLidas.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800">Notificações</span>
                  {naoLidas.length > 0 && (
                    <button
                      onClick={() => marcarTodasMutation.mutate()}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notificacoes.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm italic">Nenhuma notificação.</div>
                  ) : (
                    notificacoes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.lida) marcarLidaMutation.mutate(n.id)
                          if (n.url) navigate(n.url)
                          setShowNotifs(false)
                        }}
                        className={`p-3 text-sm cursor-pointer transition ${n.lida ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50 font-medium'}`}
                      >
                        <div className="font-semibold text-slate-800">{n.titulo}</div>
                        <div className="text-slate-600 text-xs mt-0.5">{n.mensagem}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-bold text-slate-800">{user?.first_name || user?.username}</span>
              <span className="text-xs text-slate-500">{user?.role_display}</span>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}