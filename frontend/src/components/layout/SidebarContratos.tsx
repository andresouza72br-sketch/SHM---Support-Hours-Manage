import { Link } from 'react-router-dom'
import { FileText, ShieldAlert, ChevronRight } from 'lucide-react'
import type { Contrato } from '../../types'

interface SidebarContratosProps {
  contratos: Contrato[]
  contratoSelecionado?: number | null
  onSelectContrato: (id: number | null) => void
}

export function SidebarContratos({ contratos, contratoSelecionado, onSelectContrato }: SidebarContratosProps) {
  return (
    <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contratos Ativos</h2>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
          {contratos.length}
        </span>
      </div>

      <div className="space-y-3">
        {contratos.map((c) => {
          const isSelected = contratoSelecionado === c.id
          const totalHoras = Number(c.horas_contratadas) || 1
          const saldo = Number(c.saldo) || 0
          const consumido = Number(c.horas_consumidas) || 0
          const percentConsumido = Math.min(Math.round((consumido / totalHoras) * 100), 100)

          return (
            <div
              key={c.id}
              onClick={() => onSelectContrato(isSelected ? null : c.id)}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-800">{c.numero}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    c.status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'expirado'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.status_display}
                </span>
              </div>

              <div className="text-xs text-slate-500 mb-3">{c.cliente_nome}</div>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">Saldo: <strong className="text-indigo-600 font-bold">{saldo.toFixed(1)}h</strong></span>
                  <span className="text-slate-400">Total: {totalHoras.toFixed(1)}h</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentConsumido > 85 ? 'bg-rose-500' : percentConsumido > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentConsumido}%` }}
                  />
                </div>
              </div>

              {c.em_carencia && (
                <div className="mb-3 flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-medium border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Em carência de 30 dias</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/contratos/${c.id}/extrato`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Extrato Completo</span>
                </Link>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}