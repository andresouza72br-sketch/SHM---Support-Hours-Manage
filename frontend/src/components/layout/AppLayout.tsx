import React, { useState } from 'react'
import { Header } from './Header'
import { SidebarContratos } from './SidebarContratos'
import { useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'

interface AppLayoutProps {
  children: (props: { contratoSelecionado: number | null }) => React.ReactNode
  showSidebar?: boolean
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const [contratoSelecionado, setContratoSelecionado] = useState<number | null>(null)

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        contratoSelecionado={contratoSelecionado}
        onSelectContrato={setContratoSelecionado}
        contratos={contratos}
      />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {showSidebar && contratos.length > 0 && (
          <SidebarContratos
            contratos={contratos}
            contratoSelecionado={contratoSelecionado}
            onSelectContrato={setContratoSelecionado}
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children({ contratoSelecionado })}
        </main>
      </div>
    </div>
  )
}