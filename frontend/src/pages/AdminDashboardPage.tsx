import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

export function AdminDashboardPage() {
  const navigate = useNavigate()

  return (
    <AppLayout showSidebar={false}>
      {() => {
        const { data: pedidos = [] } = useQuery({
          queryKey: ['admin_pedidos'],
          queryFn: () => clientService.pedidos.list(),
        })

        return (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Painel Operacional da Empresa</h1>
                <p className="text-xs text-slate-500">Gestão de fila de chamados, triagem em ciclos e execução técnica</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Fila Geral de Pedidos ({pedidos.length})</span>
              </div>
              <div className="divide-y divide-slate-100">
                {pedidos.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{p.protocolo}</span>
                        <span className="text-xs font-bold text-slate-500">{p.cliente_nome}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700">{p.status_display}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{p.assunto}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/admin/pedidos/${p.id}/analise`)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Triagem & Ciclos</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }}
    </AppLayout>
  )
}