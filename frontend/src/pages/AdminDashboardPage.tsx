import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, X, MessageSquare, FileText, Building2, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import type { Contrato } from '../types'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const contratoSelecionado = searchParams.get('contrato') ? Number(searchParams.get('contrato')) : null

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

  const { data: rawPedidos = [] } = useQuery({
    queryKey: ['admin_pedidos', contratoSelecionado],
    queryFn: () => clientService.pedidos.list(contratoSelecionado ? { contrato: contratoSelecionado } : undefined),
    refetchInterval: 5000,
  })

  const pedidos = Array.isArray(rawPedidos) ? rawPedidos : []

  return (
    <AppLayout
      showSidebar={false}
      contratoSelecionado={contratoSelecionado}
      onSelectContrato={handleSelectContrato}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Painel Operacional da Empresa</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Gestão de contratos de suporte, triagem em ciclos, orçamentação e execução técnica</p>
          </div>
        </div>

        {/* Grid de Contratos Ativos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Contratos de Suporte & Manutenção ({contratos.length})
              </span>
            </div>
            {contratoSelecionado && (
              <button
                onClick={() => handleSelectContrato(null)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar filtro de contrato</span>
              </button>
            )}
          </div>

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
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-500/30'
                      : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-100/80 px-2.5 py-0.5 rounded-lg">
                      {c.numero}
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.status_display}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm mb-3 truncate">
                    {c.cliente_nome || 'Cliente'}
                  </h3>

                  <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100 space-y-1.5 mb-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] font-bold text-slate-500">Saldo Disponível:</span>
                      <span className="text-base font-black text-indigo-600">{saldo.toFixed(1)}h</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(100 - percentConsumido, 5)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-0.5">
                      <span>Gasto: {consumido.toFixed(1)}h</span>
                      <span>Total: {totalHoras.toFixed(1)}h</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-extrabold text-indigo-600 flex items-center gap-1">
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Filtro Ativo</span>
                        </>
                      ) : (
                        <span>Clique para filtrar fila</span>
                      )}
                    </span>
                    <Link
                      to={`/contratos/${c.id}/extrato`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 p-1 rounded-lg hover:bg-slate-100 transition"
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

        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm text-slate-900">Fila Geral de Pedidos</span>
              {contratoSelecionado && (
                <button
                  onClick={() => handleSelectContrato(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition cursor-pointer"
                  title="Limpar filtro de contrato"
                >
                  <span>Filtrado por Contrato #{contratoSelecionado}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs bg-white text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200 shadow-2xs">
              {pedidos.length} chamados
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pedidos.map((p) => (
              <div key={p.id} className="p-5 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200/60">
                      {p.protocolo}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{p.cliente_nome}</span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {p.status_display}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{p.assunto}</h3>
                  <div className="text-xs text-slate-400 font-medium">Contrato: {p.contrato_numero}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/pedidos/${p.id}`)}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition duration-150 cursor-pointer"
                    title="Ver histórico de ciclos e comentários deste chamado"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Detalhes & Comentários</span>
                  </button>
                  <button
                    onClick={() => navigate(`/admin/pedidos/${p.id}/analise`)}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition duration-150 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Triagem & Ciclos</span>
                  </button>
                </div>
              </div>
            ))}

            {pedidos.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                {contratoSelecionado
                  ? 'Nenhum chamado encontrado para o contrato selecionado.'
                  : 'Nenhum chamado aberto na fila operacional.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}