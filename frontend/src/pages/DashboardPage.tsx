import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { clientService } from '../api/client'

export function DashboardPage() {
  return (
    <AppLayout>
      {({ contratoSelecionado }) => {
        const { data: kanbanData = {}, isLoading } = useQuery({
          queryKey: ['kanban', contratoSelecionado],
          queryFn: () => clientService.pedidos.kanban(contratoSelecionado || undefined),
        })

        return <KanbanBoard pedidosPorStatus={kanbanData} isLoading={isLoading} />
      }}
    </AppLayout>
  )
}