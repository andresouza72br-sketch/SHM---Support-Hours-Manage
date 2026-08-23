import { useNavigate } from 'react-router-dom'
import { Plus, Layers, Inbox } from 'lucide-react'
import type { Pedido, StatusPedido } from '../../types'

interface KanbanBoardProps {
  pedidosPorStatus: Record<string, Pedido[]>
  isLoading: boolean
}

const COLUNAS: { id: StatusPedido; titulo: string; dot: string; border: string; bg: string }[] = [
  { id: 'aberto', titulo: 'Abertos', dot: 'bg-slate-400', border: 'border-slate-300', bg: 'bg-slate-50/60' },
  { id: 'em_orcamento', titulo: 'Em Orçamento', dot: 'bg-indigo-500', border: 'border-indigo-200', bg: 'bg-indigo-50/30' },
  { id: 'aguardando_aprovacao', titulo: 'Ag. Aprovação', dot: 'bg-amber-500 animate-pulse', border: 'border-amber-300', bg: 'bg-amber-50/30' },
  { id: 'em_execucao', titulo: 'Em Execução', dot: 'bg-blue-500', border: 'border-blue-200', bg: 'bg-blue-50/30' },
  { id: 'aguardando_aceite', titulo: 'Ag. Aceite', dot: 'bg-purple-500 animate-pulse', border: 'border-purple-300', bg: 'bg-purple-50/30' },
  { id: 'concluido', titulo: 'Concluídos', dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50/30' },
]

export function KanbanBoard({ pedidosPorStatus = {}, isLoading }: KanbanBoardProps) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Pedidos</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">Acompanhe as fases de triagem, orçamento, execução e aceite de ciclos</p>
        </div>

        <button
          onClick={() => navigate('/pedidos/novo')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* 6-Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
        {COLUNAS.map((col) => {
          const colData = pedidosPorStatus ? pedidosPorStatus[col.id] : []
          const pedidos = Array.isArray(colData) ? colData : []

          return (
            <div
              key={col.id}
              className={`rounded-3xl border ${col.border} ${col.bg} p-3.5 flex flex-col min-h-[550px] shadow-xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3.5 px-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    {col.titulo}
                  </span>
                </div>
                <span className="text-[11px] bg-white text-slate-700 px-2.5 py-0.5 rounded-full font-black border border-slate-200/90 shadow-2xs">
                  {pedidos.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1">
                {pedidos.map((p) => {
                  const ciclos = Array.isArray(p.ciclos_resumo) ? p.ciclos_resumo : []
                  const totalHorasRealizadas = ciclos.reduce((acc, c) => acc + (Number(c.horas_realizadas) || 0), 0)
                  const totalHorasEstimadas = ciclos.reduce((acc, c) => acc + (Number(c.horas_estimadas) || 0), 0)

                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/pedidos/${p.id}`)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-400/80 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 relative"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {p.protocolo}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            p.prioridade === 'urgente'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : p.prioridade === 'alta'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : p.prioridade === 'media'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p.prioridade_display}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 line-clamp-2 mb-2.5 group-hover:text-indigo-600 transition leading-snug">
                        {p.assunto}
                      </h3>

                      <div className="text-[11px] text-slate-400 font-medium mb-3 flex items-center justify-between">
                        <span className="truncate max-w-[120px] font-semibold text-slate-500">{p.contrato_numero}</span>
                        <span>{p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>

                      {ciclos.length > 0 && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{ciclos.length} ciclo{ciclos.length > 1 ? 's' : ''}</span>
                          </span>
                          <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {totalHorasRealizadas > 0 ? `${totalHorasRealizadas.toFixed(1)}h gastas` : `${totalHorasEstimadas.toFixed(1)}h est.`}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {pedidos.length === 0 && !isLoading && (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic space-y-1">
                    <Inbox className="w-5 h-5 text-slate-300 stroke-[1.5]" />
                    <span>Nenhum pedido</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}