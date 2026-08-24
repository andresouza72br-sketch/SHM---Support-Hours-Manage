import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Painel Operacional da Empresa</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Gestão da fila de chamados, triagem em ciclos, orçamentação e execução técnica</p>
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

                <div className="flex items-center gap-3">
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