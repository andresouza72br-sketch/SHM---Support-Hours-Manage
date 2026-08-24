import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { clientService } from '../api/client'

export function DashboardPage() {
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

  const { data: kanbanData = {}, isLoading } = useQuery({
    queryKey: ['kanban', contratoSelecionado],
    queryFn: () => clientService.pedidos.kanban(contratoSelecionado || undefined),
    refetchInterval: 5000,
  })

  return (
    <AppLayout
      contratoSelecionado={contratoSelecionado}
      onSelectContrato={handleSelectContrato}
    >
      <KanbanBoard pedidosPorStatus={kanbanData} isLoading={isLoading} />
    </AppLayout>
  )
}