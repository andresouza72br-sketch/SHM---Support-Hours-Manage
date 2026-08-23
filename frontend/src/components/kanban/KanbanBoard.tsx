import { useNavigate } from 'react-router-dom'
import { Plus, Layers } from 'lucide-react'
import type { Pedido, StatusPedido } from '../../types'

interface KanbanBoardProps {
  pedidosPorStatus: Record<string, Pedido[]>
  isLoading: boolean
}

const COLUNAS: { id: StatusPedido; titulo: string; cor: string; bg: string }[] = [
  { id: 'aberto', titulo: 'Abertos', cor: 'border-slate-300', bg: 'bg-slate-50' },
  { id: 'em_orcamento', titulo: 'Em Orçamento', cor: 'border-indigo-300', bg: 'bg-indigo-50/40' },
  { id: 'aguardando_aprovacao', titulo: 'Ag. Aprovação', cor: 'border-amber-400', bg: 'bg-amber-50/40' },
  { id: 'em_execucao', titulo: 'Em Execução', cor: 'border-blue-400', bg: 'bg-blue-50/40' },
  { id: 'aguardando_aceite', titulo: 'Ag. Aceite', cor: 'border-purple-400', bg: 'bg-purple-50/40' },
  { id: 'concluido', titulo: 'Concluídos', cor: 'border-emerald-400', bg: 'bg-emerald-50/40' },
]

export function KanbanBoard({ pedidosPorStatus, isLoading }: KanbanBoardProps) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Pedidos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Acompanhe e autorize as fases dos ciclos de suporte</p>
        </div>
        <button
          onClick={() => navigate('/pedidos/novo')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pedido</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
        {COLUNAS.map((col) => {
          const pedidos = pedidosPorStatus[col.id] || []
          return (
            <div
              key={col.id}
              className={`rounded-2xl border ${col.cor} ${col.bg} p-3 flex flex-col min-h-[500px] shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  {col.titulo}
                </span>
                <span className="text-xs bg-white text-slate-600 px-2 py-0.5 rounded-full font-black border border-slate-200 shadow-2xs">
                  {pedidos.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {pedidos.map((p) => {
                  const ciclos = p.ciclos_resumo || []
                  const totalHorasRealizadas = ciclos.reduce((acc, c) => acc + (c.horas_realizadas || 0), 0)
                  const totalHorasEstimadas = ciclos.reduce((acc, c) => acc + (c.horas_estimadas || 0), 0)

                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/pedidos/${p.id}`)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {p.protocolo}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            p.prioridade === 'urgente'
                              ? 'bg-rose-100 text-rose-700 font-black'
                              : p.prioridade === 'alta'
                              ? 'bg-orange-100 text-orange-700'
                              : p.prioridade === 'media'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.prioridade_display}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition">
                        {p.assunto}
                      </h3>

                      <div className="text-[11px] text-slate-500 mb-3 flex items-center justify-between">
                        <span>{p.contrato_numero}</span>
                        <span>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {ciclos.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{ciclos.length} ciclo{ciclos.length > 1 ? 's' : ''}</span>
                          </span>
                          <span className="text-indigo-600 font-bold text-[11px]">
                            {totalHorasRealizadas > 0 ? `${totalHorasRealizadas}h gastas` : `${totalHorasEstimadas}h est.`}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {pedidos.length === 0 && !isLoading && (
                  <div className="h-24 flex items-center justify-center text-slate-400 text-xs italic">
                    Sem pedidos
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