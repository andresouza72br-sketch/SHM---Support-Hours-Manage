import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  Building2,
  CheckCheck,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ModalAgendamento } from '../components/schedule/ModalAgendamento'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import type { Agendamento, StatusAgendamento } from '../types'

type AbaVisao = 'proximas' | 'calendario' | 'historico'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function SchedulePage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const contratoUrl = searchParams.get('contrato') ? Number(searchParams.get('contrato')) : null
  const clienteUrl = searchParams.get('cliente') ? Number(searchParams.get('cliente')) : null
  const pedidoUrl = searchParams.get('pedido') ? Number(searchParams.get('pedido')) : null

  const [abaAtiva, setAbaAtiva] = useState<AbaVisao>('proximas')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Estado do Calendário Mensal
  const [dataCalendario, setDataCalendario] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())

  // Estado do Modal de Cancelamento
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Query de Contratos (para reconhecer o contrato/cliente em foco)
  const { data: contratosRaw = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => clientService.contratos.list(),
  })
  const contratos = Array.isArray(contratosRaw) ? contratosRaw : []

  const contratoEmFoco = useMemo(() => {
    if (!contratoUrl) return null
    return contratos.find((c) => c.id === contratoUrl) || null
  }, [contratos, contratoUrl])

  const clienteEmFocoId = clienteUrl || contratoEmFoco?.cliente || null
  const clienteEmFocoNome = useMemo(() => {
    if (contratoEmFoco?.cliente_nome) return contratoEmFoco.cliente_nome
    if (clienteEmFocoId) {
      const matchContrato = contratos.find((item) => item.cliente === clienteEmFocoId)
      if (matchContrato?.cliente_nome) return matchContrato.cliente_nome
    }
    return ''
  }, [contratoEmFoco, clienteEmFocoId, contratos])

  const handleSelectContrato = (id: number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) {
      newParams.set('contrato', String(id))
    } else {
      newParams.delete('contrato')
    }
    setSearchParams(newParams)
  }

  // Query dos Agendamentos
  const {
    data: agendamentosRaw = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['schedule_agendamentos'],
    queryFn: () => clientService.schedule.list(),
    refetchInterval: 15000,
  })

  const agendamentos: Agendamento[] = Array.isArray(agendamentosRaw) ? agendamentosRaw : []

  // Ação de Atualização com feedback em tempo real
  const handleAtualizar = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] }),
        queryClient.invalidateQueries({ queryKey: ['contratos'] }),
        refetch(),
      ])
      toast.success('Agenda de suporte atualizada com sucesso.', 'Atualizado')
    } catch {
      toast.error('Erro ao atualizar dados da agenda.', 'Erro')
    }
  }

  // Mutação para Cancelar Agendamento
  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number | string; motivo: string }) =>
      clientService.schedule.cancelar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
      toast.success('Agendamento cancelado com sucesso.', 'Agenda SHM')
      setAgendamentoParaCancelar(null)
      setMotivoCancelamento('')
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Não foi possível cancelar o agendamento.'
      toast.error(msg, 'Erro ao Cancelar')
    },
  })

  const handleCopiarLinkMeet = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link do Google Meet copiado!', 'Copiado')
  }

  // Filtragem geral
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((item) => {
      // Busca textual
      if (termoBusca.trim()) {
        const termo = termoBusca.toLowerCase()
        const matchTitulo = item.titulo.toLowerCase().includes(termo)
        const matchCliente = (item.cliente_nome || '').toLowerCase().includes(termo)
        const matchProtocolo = (item.pedido_protocolo || '').toLowerCase().includes(termo)
        if (!matchTitulo && !matchCliente && !matchProtocolo) return false
      }

      // Filtro de tipo
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) {
        return false
      }

      // Filtro de status
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) {
        return false
      }

      // Filtro contextual de cliente/contrato em foco (se ativo)
      if (clienteEmFocoId && item.cliente && item.cliente !== clienteEmFocoId) {
        return false
      }

      return true
    })
  }, [agendamentos, termoBusca, filtroTipo, filtroStatus, clienteEmFocoId])

  // Separação por Próximas vs Histórico
  const agora = new Date()

  const proximosAgendamentos = useMemo(() => {
    return agendamentosFiltrados
      .filter((item) => {
        if (item.status === 'cancelado') return false
        const fim = new Date(item.data_fim)
        return fim >= agora
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  }, [agendamentosFiltrados, agora])

  const historicoAgendamentos = useMemo(() => {
    return agendamentosFiltrados
      .filter((item) => {
        if (item.status === 'cancelado') return true
        const fim = new Date(item.data_fim)
        return fim < agora
      })
      .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())
  }, [agendamentosFiltrados, agora])

  // Lógica do Calendário Mensal
  const anoAtual = dataCalendario.getFullYear()
  const mesAtual = dataCalendario.getMonth()

  const primeiroDiaMes = new Date(anoAtual, mesAtual, 1)
  const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0)
  const diasNoMes = ultimoDiaMes.getDate()
  const diaSemanaInicio = primeiroDiaMes.getDay()

  const navegarMes = (direcao: 'ant' | 'prox') => {
    setDataCalendario(
      new Date(anoAtual, direcao === 'ant' ? mesAtual - 1 : mesAtual + 1, 1)
    )
  }

  // Agendamentos mapeados por dia do mês atual
  const agendamentosPorDia = useMemo(() => {
    const mapa: Record<number, Agendamento[]> = {}
    agendamentos.forEach((item) => {
      const dt = new Date(item.data_inicio)
      if (dt.getFullYear() === anoAtual && dt.getMonth() === mesAtual) {
        const dia = dt.getDate()
        if (!mapa[dia]) mapa[dia] = []
        mapa[dia].push(item)
      }
    })
    return mapa
  }, [agendamentos, anoAtual, mesAtual])

  const eventosDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return agendamentos.filter((item) => {
      const dt = new Date(item.data_inicio)
      return (
        dt.getFullYear() === diaSelecionado.getFullYear() &&
        dt.getMonth() === diaSelecionado.getMonth() &&
        dt.getDate() === diaSelecionado.getDate()
      )
    })
  }, [agendamentos, diaSelecionado])

  const formatarHorario = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatarDataCompleta = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status?: StatusAgendamento, display?: string) => {
    const textoDisplay = display || status || 'Agendado'
    switch (status) {
      case 'agendado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'em_andamento':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'realizado':
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <CheckCheck className="w-3 h-3 text-slate-500" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <X className="w-3 h-3 text-rose-500" />
            <span>{textoDisplay}</span>
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {textoDisplay}
          </span>
        )
    }
  }

  const renderCardAgendamento = (item: Agendamento) => {
    const fim = new Date(item.data_fim)
    const isPassado = fim < agora
    const isCancelado = item.status === 'cancelado'
    const meetLink = item.google_meet_link || item.meet_link
    const isSincronizado = item.google_sincronizado || item.google_calendar_status === 'sincronizado'

    return (
      <div
        key={item.id}
        className={`p-5 rounded-3xl border transition-all duration-200 relative ${
          isCancelado
            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 opacity-75'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(item.status, item.status_display)}
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {item.tipo_display || item.tipo}
              </span>
              {item.cliente_nome && (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {item.cliente_nome}
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
              {item.titulo}
            </h3>

            {item.descricao && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {item.descricao}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 capitalize">
              {formatarDataCompleta(item.data_inicio)}
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {formatarHorario(item.data_inicio)} - {formatarHorario(item.data_fim)}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                ({item.duracao_minutos} min)
              </span>
            </div>
          </div>
        </div>

        {/* Vínculo Operacional (Pedido / Ciclo) */}
        {(item.pedido_protocolo || item.ciclo) && (
          <div className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {item.pedido_protocolo && (
              <Link
                to={`/admin/pedidos/${item.pedido}/analise`}
                className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              >
                <FileText className="w-3 h-3" />
                <span>Pedido #{item.pedido_protocolo}</span>
              </Link>
            )}
            {item.ciclo && (
              <span className="text-slate-500 dark:text-slate-400">
                Ciclo #{item.ciclo}
              </span>
            )}
          </div>
        )}

        {/* Participantes */}
        {item.participantes && item.participantes.length > 0 && (
          <div className="mb-4">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Participantes ({item.participantes.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.participantes.map((p, idx) => (
                <span
                  key={p.id ?? idx}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                  title={`${p.nome} (${p.email}) - ${p.tipo}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{p.nome}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({p.tipo})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé e Ações (Meet Link & Cancelar) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isSincronizado ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Google Calendar sincronizado</span>
              </span>
            ) : item.google_calendar_status === 'pendente' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando com Google Calendar...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <span>Google Calendar offline</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {meetLink && !isCancelado && (
              <>
                <button
                  onClick={() => handleCopiarLinkMeet(meetLink)}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Copiar link do Google Meet"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xs hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Entrar no Meet</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </>
            )}

            {!isPassado && !isCancelado && (
              <button
                onClick={() => setAgendamentoParaCancelar(item)}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                title="Cancelar agendamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      contratoSelecionado={contratoUrl}
      onSelectContrato={handleSelectContrato}
    >
      <div className="space-y-6">
        {/* Banner de Contexto de Cliente / Contrato em Foco */}
        {contratoEmFoco && (
          <div className="flex items-center justify-between gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 p-3.5 rounded-2xl text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-700 dark:text-slate-300">
                Foco ativo: <strong className="text-slate-900 dark:text-white font-black">{contratoEmFoco.cliente_nome}</strong> • Contrato #{contratoEmFoco.numero}
              </span>
            </div>
            <button
              onClick={() => handleSelectContrato(null)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Ver todos os clientes
            </button>
          </div>
        )}
        {/* Cabeçalho Superior da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Agenda de Suporte
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sincronização em tempo real com Google Calendar (`suporte-SHM`) e Google Meet
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAtualizar}
              disabled={isFetching}
              className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
              title="Atualizar agenda e sincronização em tempo real"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">
                {isFetching ? 'Atualizando...' : 'Atualizar'}
              </span>
            </button>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Barra de Abas e Filtros */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Navegação de Abas */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
            <button
              onClick={() => setAbaAtiva('proximas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'proximas'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Próximas ({proximosAgendamentos.length})
            </button>
            <button
              onClick={() => setAbaAtiva('calendario')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'calendario'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Calendário Mensal
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Histórico ({historicoAgendamentos.length})
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar por título, cliente..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="alinhamento">Alinhamento</option>
              <option value="apresentacao_orcamento">Apresentação Orçamento</option>
              <option value="homologacao">Homologação</option>
              <option value="suporte_emergencial">Suporte Emergencial</option>
              <option value="reuniao_geral">Geral</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="agendado">Agendado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Conteúdo Principal de acordo com a Aba */}
        {isLoading ? (
          <div className="p-16 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Carregando agendamentos e sincronização em tempo real...
            </span>
          </div>
        ) : (
          <>
            {abaAtiva === 'proximas' && (
          <div className="space-y-4">
            {proximosAgendamentos.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Nenhuma reunião agendada
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Não há compromissos futuros cadastrados para os filtros selecionados.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleAtualizar}
                    disabled={isFetching}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>
                  <button
                    onClick={() => setModalNovoAberto(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition cursor-pointer"
                  >
                    + Agendar Primeira Reunião
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {proximosAgendamentos.map(renderCardAgendamento)}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'calendario' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade do Calendário */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
                  {MESES[mesAtual]} {anoAtual}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAtualizar}
                    disabled={isFetching}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-60"
                    title="Atualizar eventos do calendário"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => navegarMes('ant')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDataCalendario(new Date())}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => navegarMes('prox')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-400 py-1 border-b border-slate-100 dark:border-slate-700">
                {DIAS_SEMANA.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Matriz dos Dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: diaSemanaInicio }).map((_, i) => (
                  <div key={`vazio-${i}`} className="h-20 p-1 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl" />
                ))}

                {Array.from({ length: diasNoMes }).map((_, i) => {
                  const dia = i + 1
                  const eventos = agendamentosPorDia[dia] || []
                  const isHoje =
                    agora.getFullYear() === anoAtual &&
                    agora.getMonth() === mesAtual &&
                    agora.getDate() === dia
                  const isSelecionado =
                    diaSelecionado &&
                    diaSelecionado.getFullYear() === anoAtual &&
                    diaSelecionado.getMonth() === mesAtual &&
                    diaSelecionado.getDate() === dia

                  return (
                    <div
                      key={`dia-${dia}`}
                      onClick={() => setDiaSelecionado(new Date(anoAtual, mesAtual, dia))}
                      className={`min-h-[85px] p-1.5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelecionado
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                            isHoje
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {dia}
                        </span>

                        {eventos.length > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {eventos.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 overflow-hidden">
                        {eventos.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-slate-700 text-indigo-900 dark:text-slate-200"
                            title={`${formatarHorario(ev.data_inicio)} - ${ev.titulo}`}
                          >
                            {formatarHorario(ev.data_inicio)} {ev.titulo}
                          </div>
                        ))}
                        {eventos.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-bold px-1">
                            +{eventos.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Painel Lateral do Dia Selecionado */}
            <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {diaSelecionado
                      ? diaSelecionado.toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        })
                      : 'Nenhum dia selecionado'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {eventosDiaSelecionado.length} reuniões
                  </span>
                </div>
              </div>

              {eventosDiaSelecionado.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhuma reunião agendada para esta data.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {eventosDiaSelecionado.map((item) => {
                    const meetLink = item.google_meet_link || item.meet_link
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {formatarHorario(item.data_inicio)} - {formatarHorario(item.data_fim)}
                          </span>
                          {getStatusBadge(item.status, item.status_display)}
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.titulo}
                        </h4>

                        {item.cliente_nome && (
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Cliente: {item.cliente_nome}
                          </p>
                        )}

                        {meetLink && item.status !== 'cancelado' && (
                          <a
                            href={meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition mt-2"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Entrar no Meet</span>
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="space-y-4">
            {historicoAgendamentos.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
                <p className="text-slate-400 text-xs">
                  Nenhum histórico de reunião encontrado para os filtros selecionados.
                </p>
                <button
                  onClick={handleAtualizar}
                  disabled={isFetching}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                  <span>Atualizar Histórico</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {historicoAgendamentos.map(renderCardAgendamento)}
              </div>
            )}
          </div>
        )}
      </>
    )}
  </div>

      {/* Modal de Criação de Agendamento */}
      <ModalAgendamento
        isOpen={modalNovoAberto}
        onClose={() => setModalNovoAberto(false)}
        clienteId={clienteEmFocoId || undefined}
        clienteNome={clienteEmFocoNome || undefined}
        contratoId={contratoUrl || undefined}
        contratoNumero={contratoEmFoco?.numero || undefined}
        pedidoId={pedidoUrl || undefined}
        onAgendado={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
          queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
        }}
      />

      {/* Modal de Confirmação de Cancelamento */}
      {agendamentoParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Cancelar Reunião
                </h3>
                <p className="text-xs text-slate-500">
                  A reunião será cancelada no Google Calendar e os participantes serão avisados.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {agendamentoParaCancelar.titulo}
              </span>
              <p className="text-slate-500">
                {formatarDataCompleta(agendamentoParaCancelar.data_inicio)} às{' '}
                {formatarHorario(agendamentoParaCancelar.data_inicio)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo do Cancelamento:
              </label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Reagendado por solicitação do cliente..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAgendamentoParaCancelar(null)
                  setMotivoCancelamento('')
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelarMutation.isPending}
                onClick={() => {
                  cancelarMutation.mutate({
                    id: agendamentoParaCancelar.id,
                    motivo: motivoCancelamento,
                  })
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
