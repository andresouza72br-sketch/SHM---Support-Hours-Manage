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
    refetchInterval: 5000,
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
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800/60">
                {pedido.protocolo}
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{pedido.assunto}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3.5 py-1.5 rounded-full uppercase bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                Contrato: {pedido.contrato_numero} (Saldo: {pedido.contrato_saldo}h)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Descrição Original da Demanda</h3>
          <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-medium">{pedido.descricao}</p>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Ciclos de Atendimento ({ciclos.length})</span>
          </h2>
          <CicloCarousel pedido={pedido} ciclos={ciclos} />
        </div>
      </div>
    </AppLayout>
  )
}