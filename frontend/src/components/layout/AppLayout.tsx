import React, { useState } from 'react'
import { Header } from './Header'
import { SidebarContratos } from './SidebarContratos'
import { useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  contratoSelecionado?: number | null
  onSelectContrato?: (id: number | null) => void
}

export function AppLayout({
  children,
  showSidebar = true,
  contratoSelecionado,
  onSelectContrato,
}: AppLayoutProps) {
  const [internalContrato, setInternalContrato] = useState<number | null>(null)
  const selected = contratoSelecionado !== undefined ? contratoSelecionado : internalContrato
  const setSelected = onSelectContrato || setInternalContrato

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        contratoSelecionado={selected}
        onSelectContrato={setSelected}
        contratos={contratos}
      />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {showSidebar && contratos.length > 0 && (
          <SidebarContratos
            contratos={contratos}
            contratoSelecionado={selected}
            onSelectContrato={setSelected}
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}