import { Link } from 'react-router-dom'
import { FileText, ShieldAlert, ChevronRight } from 'lucide-react'
import type { Contrato } from '../../types'

interface SidebarContratosProps {
  contratos: Contrato[]
  contratoSelecionado?: number | null
  onSelectContrato: (id: number | null) => void
}

export function SidebarContratos({ contratos = [], contratoSelecionado, onSelectContrato }: SidebarContratosProps) {
  const listaContratos = Array.isArray(contratos) ? contratos : []

  return (
    <aside className="w-full md:w-80 bg-white/70 backdrop-blur-md border-r border-slate-200/80 flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Contratos Ativos</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
            {listaContratos.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {listaContratos.map((c) => {
          const isSelected = contratoSelecionado === c.id
          const totalHoras = Number(c.horas_contratadas) || 1
          const saldo = Number(c.saldo) || 0
          const consumido = Number(c.horas_consumidas) || 0
          const percentConsumido = Math.min(Math.round((consumido / totalHoras) * 100), 100)

          return (
            <div
              key={c.id}
              onClick={() => onSelectContrato(isSelected ? null : c.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/5 ring-2 ring-indigo-500/20'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100/80 px-2 py-0.5 rounded-md">
                  {c.numero}
                </span>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    c.status === 'ativo'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : c.status === 'expirado'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {c.status_display}
                </span>
              </div>

              <div className="text-xs font-bold text-slate-700 mb-3 truncate">{c.cliente_nome}</div>

              {/* Progress & Balances */}
              <div className="space-y-1.5 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500 text-[11px]">Saldo Disponível:</span>
                  <span className="text-sm font-black text-indigo-600">{saldo.toFixed(1)}h</span>
                </div>
                <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentConsumido > 85
                        ? 'bg-rose-500'
                        : percentConsumido > 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentConsumido}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                  <span>Gasto: {consumido.toFixed(1)}h ({percentConsumido}%)</span>
                  <span>Total: {totalHoras.toFixed(1)}h</span>
                </div>
              </div>

              {c.em_carencia && (
                <div className="mb-3 flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-xl font-semibold border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Carência de 30 dias ativa</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/contratos/${c.id}/extrato`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px] group/link"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500 group-hover/link:scale-110 transition" />
                  <span>Extrato Detalhado</span>
                </Link>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          )
        })}

        {listaContratos.length === 0 && (
          <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Nenhum contrato ativo encontrado.
          </div>
        )}
      </div>
    </aside>
  )
}