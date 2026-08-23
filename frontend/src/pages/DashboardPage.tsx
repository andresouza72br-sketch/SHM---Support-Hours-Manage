import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { clientService } from '../api/client'

export function DashboardPage() {
  const [contratoSelecionado, setContratoSelecionado] = useState<number | null>(null)

  const { data: kanbanData = {}, isLoading } = useQuery({
    queryKey: ['kanban', contratoSelecionado],
    queryFn: () => clientService.pedidos.kanban(contratoSelecionado || undefined),
  })

  return (
    <AppLayout
      contratoSelecionado={contratoSelecionado}
      onSelectContrato={setContratoSelecionado}
    >
      <KanbanBoard pedidosPorStatus={kanbanData} isLoading={isLoading} />
    </AppLayout>
  )
}