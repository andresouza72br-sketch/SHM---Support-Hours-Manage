import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { clientService } from '../../api/client'
import type { Agendamento } from '../../types'

interface ProximaReuniaoWidgetProps {
  className?: string
  onNovoAgendamentoClick?: () => void
}

export const ProximaReuniaoWidget: React.FC<ProximaReuniaoWidgetProps> = ({
  className = '',
  onNovoAgendamentoClick,
}) => {
  const { data: proximaReuniao, isLoading } = useQuery<Agendamento | null>({
    queryKey: ['schedule_proxima'],
    queryFn: async () => {
      try {
        return await clientService.schedule.proxima()
      } catch {
        return null
      }
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div
        className={`p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs animate-pulse ${className}`}
      >
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      </div>
    )
  }

  if (!proximaReuniao) {
    return (
      <div
        className={`p-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs flex items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
              Nenhuma reunião pendente
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sua agenda está em dia. Sincronizada com o Google Calendar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNovoAgendamentoClick && (
            <button
              onClick={onNovoAgendamentoClick}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              + Agendar
            </button>
          )}
          <Link
            to="/schedule"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
          >
            <span>Ver Agenda</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // Cálculos de tempo relativo
  const agora = new Date()
  const dataInicio = new Date(proximaReuniao.data_inicio)
  const dataFim = new Date(proximaReuniao.data_fim)
  const diffMs = dataInicio.getTime() - agora.getTime()
  const diffMinutos = Math.round(diffMs / (1000 * 60))

  const isHoje = agora.toDateString() === dataInicio.toDateString()
  const isAmanha =
    new Date(agora.getTime() + 24 * 60 * 60 * 1000).toDateString() ===
    dataInicio.toDateString()

  let statusTempoTexto = ''
  let statusTempoCor =
    'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'

  if (diffMinutos <= 0 && agora <= dataFim) {
    statusTempoTexto = 'Em andamento agora'
    statusTempoCor =
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 animate-pulse'
  } else if (diffMinutos > 0 && diffMinutos <= 15) {
    statusTempoTexto = `Começa em ${diffMinutos} min!`
    statusTempoCor =
      'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
  } else if (diffMinutos > 15 && diffMinutos <= 60) {
    statusTempoTexto = `Começa em ${diffMinutos} min`
    statusTempoCor =
      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  } else if (isHoje) {
    statusTempoTexto = `Hoje às ${dataInicio.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else if (isAmanha) {
    statusTempoTexto = `Amanhã às ${dataInicio.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else {
    statusTempoTexto = dataInicio.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={`p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-xs relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Video className="w-4 h-4" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
            Próxima Reunião
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${statusTempoCor}`}
          >
            {statusTempoTexto}
          </span>
        </div>

        <Link
          to="/schedule"
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 inline-flex items-center gap-1 transition"
        >
          <span>Agenda Geral</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Informações Principais */}
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {proximaReuniao.tipo_display || proximaReuniao.tipo}
            </span>
            {proximaReuniao.cliente_nome && (
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                • {proximaReuniao.cliente_nome}
              </span>
            )}
            {proximaReuniao.pedido_protocolo && (
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                #{proximaReuniao.pedido_protocolo}
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
            {proximaReuniao.titulo}
          </h3>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {dataInicio.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {dataFim.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({proximaReuniao.duracao_minutos} min)
              </span>
            </div>

            {proximaReuniao.participantes && proximaReuniao.participantes.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{proximaReuniao.participantes.length} participantes</span>
              </div>
            )}
          </div>
        </div>

        {/* Ação CTA para o Google Meet */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch justify-center gap-2">
          {proximaReuniao.google_meet_link || proximaReuniao.meet_link ? (
            <a
              href={(proximaReuniao.google_meet_link || proximaReuniao.meet_link)!}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>Entrar no Google Meet</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </a>
          ) : (
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium text-center">
              Reunião sem link Google Meet
            </div>
          )}

          {(proximaReuniao.google_sincronizado || proximaReuniao.google_calendar_status === 'sincronizado') && (
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Google Calendar sincronizado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
