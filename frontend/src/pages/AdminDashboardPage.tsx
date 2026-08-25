import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, X, MessageSquare, FileText, Building2, CheckCircle2, Flame, AlertTriangle, Play, Inbox, Clock, CheckCheck, Sparkles } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import type { Contrato, Pedido } from '../types'

const STATUS_WEIGHT: Record<string, number> = {
  em_execucao: 1,
  aberto: 2,
  em_orcamento: 3,
  aguardando_aprovacao: 4,
  aguardando_aceite: 5,
  concluido: 6,
  cancelado: 7,
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgente: 1,
  alta: 2,
  media: 3,
  baixa: 4,
}

type FilterTab = 'todos' | 'em_execucao' | 'triagem' | 'aguardando_cliente' | 'concluidos'

function getStatusBadge(status: string, statusDisplay: string) {
  switch (status) {
    case 'em_execucao':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <span>{statusDisplay}</span>
        </span>
      )
    case 'aberto':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span>{statusDisplay}</span>
        </span>
      )
    case 'em_orcamento':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{statusDisplay}</span>
        </span>
      )
    case 'aguardando_aprovacao':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <span>{statusDisplay}</span>
        </span>
      )
    case 'aguardando_aceite':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <span>{statusDisplay}</span>
        </span>
      )
    case 'concluido':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{statusDisplay}</span>
        </span>
      )
    case 'cancelado':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <span>{statusDisplay}</span>
        </span>
      )
    default:
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {statusDisplay}
        </span>
      )
  }
}

function getPriorityBadge(prioridade?: string, prioridadeDisplay?: string) {
  if (prioridade === 'urgente') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs animate-pulse">
        <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        <span>{prioridadeDisplay || 'Urgente'}</span>
      </span>
    )
  }
  if (prioridade === 'alta') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        <span>{prioridadeDisplay || 'Alta'}</span>
      </span>
    )
  }
  return null
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const contratoSelecionado = searchParams.get('contrato') ? Number(searchParams.get('contrato')) : null
  const [filterTab, setFilterTab] = useState<FilterTab>('todos')

  const handleSelectContrato = (id: number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) {
      newParams.set('contrato', String(id))
    } else {
      newParams.delete('contrato')
    }
    setSearchParams(newParams)
  }

  const { data: rawContratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
    refetchInterval: 5000,
  })

  const contratos: Contrato[] = Array.isArray(rawContratos) ? rawContratos : []
  const contratoAtivo = contratos.find((c) => c.id === contratoSelecionado)

  const { data: rawPedidos = [] } = useQuery({
    queryKey: ['admin_pedidos', contratoSelecionado],
    queryFn: () => clientService.pedidos.list(contratoSelecionado ? { contrato: contratoSelecionado } : undefined),
    refetchInterval: 5000,
  })

  const pedidos: Pedido[] = Array.isArray(rawPedidos) ? rawPedidos : []

  // Contadores por estágio operacional
  const counts = useMemo(() => {
    return {
      todos: pedidos.length,
      em_execucao: pedidos.filter((p) => p.status === 'em_execucao').length,
      triagem: pedidos.filter((p) => p.status === 'aberto' || p.status === 'em_orcamento').length,
      aguardando_cliente: pedidos.filter((p) => p.status === 'aguardando_aprovacao' || p.status === 'aguardando_aceite').length,
      concluidos: pedidos.filter((p) => p.status === 'concluido' || p.status === 'cancelado').length,
    }
  }, [pedidos])

  // Ordenação Inteligente: Execução -> Aberto -> Orçamento -> Aguardando Cliente -> Concluídos -> Cancelados
  // Secundária: Prioridade (Urgente > Alta > Média > Baixa) -> Data
  const pedidosOrdenados = useMemo(() => {
    const sorted = [...pedidos].sort((a, b) => {
      const weightA = STATUS_WEIGHT[a.status] || 99
      const weightB = STATUS_WEIGHT[b.status] || 99
      if (weightA !== weightB) return weightA - weightB

      const prioA = PRIORITY_WEIGHT[a.prioridade] || 99
      const prioB = PRIORITY_WEIGHT[b.prioridade] || 99
      if (prioA !== prioB) return prioA - prioB

      return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    })

    if (filterTab === 'em_execucao') return sorted.filter((p) => p.status === 'em_execucao')
    if (filterTab === 'triagem') return sorted.filter((p) => p.status === 'aberto' || p.status === 'em_orcamento')
    if (filterTab === 'aguardando_cliente') return sorted.filter((p) => p.status === 'aguardando_aprovacao' || p.status === 'aguardando_aceite')
    if (filterTab === 'concluidos') return sorted.filter((p) => p.status === 'concluido' || p.status === 'cancelado')
    return sorted
  }, [pedidos, filterTab])

  return (
    <AppLayout
      showSidebar={false}
      contratoSelecionado={contratoSelecionado}
      onSelectContrato={handleSelectContrato}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Painel Operacional da Empresa</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Gestão de contratos de suporte, triagem em ciclos, orçamentação e execução técnica</p>
          </div>
        </div>

        {/* Grid de Contratos Ativos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Contratos de Suporte & Manutenção ({contratos.length})
              </span>
              {contratos.length > 6 && (
                <span className="hidden sm:inline text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                  Role para ver todos ({contratos.length})
                </span>
              )}
            </div>
            {contratoSelecionado && (
              <button
                onClick={() => handleSelectContrato(null)}
                className="text-xs font-black text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar filtro de contrato</span>
              </button>
            )}
          </div>

          <div className="max-h-[470px] overflow-y-auto pr-1.5 p-1 rounded-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contratos.map((c) => {
                const isSelected = contratoSelecionado === c.id
                const totalHoras = Number(c.horas_contratadas) || 1
                const saldo = Number(c.saldo) || 0
                const consumido = Number(c.horas_consumidas) || 0
                const percentConsumido = Math.min(Math.round((consumido / totalHoras) * 100), 100)

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectContrato(isSelected ? null : c.id)}
                    className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative ${
                      isSelected
                        ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/30'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-xs text-indigo-950 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-300 dark:border-indigo-800/60">
                        {c.numero}
                      </span>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                        {c.status_display}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm mb-3 truncate">
                      {c.cliente_nome || 'Cliente'}
                    </h3>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 mb-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">Saldo Disponível:</span>
                        <span className="text-base font-black text-indigo-700 dark:text-indigo-400">{saldo.toFixed(1)}h</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentConsumido <= 25
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : percentConsumido <= 50
                              ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                              : percentConsumido <= 75
                              ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                              : 'bg-gradient-to-r from-orange-500 to-rose-600'
                          }`}
                          style={{ width: `${percentConsumido}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-bold pt-0.5">
                        <span>Gasto: {consumido.toFixed(1)}h ({percentConsumido}%)</span>
                        <span>Total: {totalHoras.toFixed(1)}h</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                            <span>Filtro Ativo</span>
                          </>
                        ) : (
                          <span>Clique para filtrar fila</span>
                        )}
                      </span>
                      <Link
                        to={`/contratos/${c.id}/extrato`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Ver extrato financeiro/horas deste contrato"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Extrato</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fila Geral de Pedidos com Ordenação Inteligente & Abas de Filtro */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Header da Seção */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 dark:text-white leading-tight">Fila Operacional de Pedidos</h2>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Ordem por prioridade de atendimento: Em Execução → Novos/Triagem → Aguardando Cliente → Concluídos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {contratoSelecionado && (
                  <button
                    onClick={() => handleSelectContrato(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 border border-indigo-300 dark:border-indigo-800 transition cursor-pointer shadow-2xs group"
                    title="Clique para limpar o filtro de contrato"
                  >
                    <span>
                      Filtrado por:{' '}
                      <strong className="font-mono text-indigo-950 dark:text-indigo-200 font-bold">
                        {contratoAtivo?.numero || `#${contratoSelecionado}`}
                      </strong>
                      {contratoAtivo?.cliente_nome ? ` — ${contratoAtivo.cliente_nome}` : ''}
                    </span>
                    <X className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-200 transition shrink-0" />
                  </button>
                )}
                <span className="text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-3 py-1.5 rounded-full font-black border border-slate-300 dark:border-slate-700 shadow-2xs">
                  {pedidosOrdenados.length} {pedidosOrdenados.length === 1 ? 'chamado' : 'chamados'}
                </span>
              </div>
            </div>

            {/* Abas Rápidas de Filtro Operacional */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                onClick={() => setFilterTab('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'todos'
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <span>Todos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterTab === 'todos' ? 'bg-slate-800 dark:bg-indigo-700 text-slate-200 dark:text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'}`}>
                  {counts.todos}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('em_execucao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'em_execucao'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Em Execução</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterTab === 'em_execucao' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 dark:bg-slate-700 text-indigo-900 dark:text-indigo-300'}`}>
                  {counts.em_execucao}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('triagem')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'triagem'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-violet-800 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-700 border border-violet-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <Inbox className="w-3 h-3" />
                <span>Novos & Triagem</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterTab === 'triagem' ? 'bg-violet-700 text-violet-100' : 'bg-violet-100 dark:bg-slate-700 text-violet-900 dark:text-violet-300'}`}>
                  {counts.triagem}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('aguardando_cliente')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'aguardando_cliente'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-sky-800 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 border border-sky-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Aguardando Cliente</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterTab === 'aguardando_cliente' ? 'bg-sky-700 text-sky-100' : 'bg-sky-100 dark:bg-slate-700 text-sky-900 dark:text-sky-300'}`}>
                  {counts.aguardando_cliente}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('concluidos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'concluidos'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <CheckCheck className="w-3 h-3" />
                <span>Concluídos / Histórico</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterTab === 'concluidos' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'}`}>
                  {counts.concluidos}
                </span>
              </button>
            </div>
          </div>

          {/* Listagem de Pedidos Ordenados */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {pedidosOrdenados.map((p) => {
              const isExec = p.status === 'em_execucao'
              const isAberto = p.status === 'aberto'
              const isOrcamento = p.status === 'em_orcamento'
              const isConcluido = p.status === 'concluido' || p.status === 'cancelado'

              return (
                <div
                  key={p.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-150 border-l-4 ${
                    isExec
                      ? 'border-l-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/30'
                      : isAberto
                      ? 'border-l-violet-500 bg-violet-50/30 dark:bg-violet-950/15 hover:bg-violet-50/50 dark:hover:bg-violet-900/25'
                      : isOrcamento
                      ? 'border-l-amber-500 bg-amber-50/25 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-900/20'
                      : isConcluido
                      ? 'border-l-emerald-500 opacity-80 hover:opacity-100 bg-slate-50/50 dark:bg-slate-850/30'
                      : 'border-l-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {p.protocolo}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{p.cliente_nome}</span>
                      
                      {/* Priority badge (Urgente / Alta) */}
                      {getPriorityBadge(p.prioridade, p.prioridade_display)}

                      {/* Status badge */}
                      {getStatusBadge(p.status, p.status_display)}
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">{p.assunto}</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      <span>Contrato: <strong className="text-slate-900 dark:text-slate-300 font-mono">{p.contrato_numero}</strong></span>
                      {p.criado_em && (
                        <span>• Aberto em: {new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/pedidos/${p.id}`)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 transition duration-150 cursor-pointer shadow-2xs"
                      title="Ver histórico de ciclos e comentários deste chamado"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Detalhes & Comentários</span>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/pedidos/${p.id}/analise`)}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition duration-150 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Triagem & Ciclos</span>
                    </button>
                  </div>
                </div>
              )
            })}

            {pedidosOrdenados.length === 0 && (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">
                {contratoSelecionado
                  ? `Nenhum chamado encontrado nesta categoria para o contrato ${contratoAtivo ? `${contratoAtivo.numero} (${contratoAtivo.cliente_nome})` : `#${contratoSelecionado}`}.`
                  : 'Nenhum chamado encontrado para o filtro selecionado.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}