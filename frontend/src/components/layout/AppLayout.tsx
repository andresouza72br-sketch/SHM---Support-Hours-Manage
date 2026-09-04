import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { SidebarContratos } from './SidebarContratos'
import { useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { ScrollToTopButton } from '../ui/ScrollToTopButton'

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
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // Reseta o scroll do main ao mudar de rota
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
    refetchInterval: 5000,
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
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
        <div className="flex-1 min-w-0 relative flex flex-col overflow-hidden">
          <ScrollToTopButton targetRef={mainRef} title="Rolar para o topo da página" />
          <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}