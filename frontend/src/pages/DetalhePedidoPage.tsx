import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Layers } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { CicloCarousel } from '../components/ciclos/CicloCarousel'
import { clientService } from '../api/client'

export function DetalhePedidoPage() {
  const { id } = useParams<{ id: string }>()

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => clientService.pedidos.get(Number(id)),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-medium">Carregando detalhes do pedido...</div>
      </AppLayout>
    )
  }

  if (!pedido) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Pedido não encontrado.</div>
      </AppLayout>
    )
  }

  const ciclos = pedido.ciclos || []

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-md">
                {pedido.protocolo}
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{pedido.assunto}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full uppercase bg-slate-100 text-slate-700">
                Contrato: {pedido.contrato_numero} (Saldo: {pedido.contrato_saldo}h)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição Original da Demanda</h3>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{pedido.descricao}</p>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Ciclos de Atendimento ({ciclos.length})</span>
          </h2>
          <CicloCarousel pedido={pedido} ciclos={ciclos} />
        </div>
      </div>
    </AppLayout>
  )
}