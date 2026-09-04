import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ShieldAlert, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'
import type { Contrato } from '../../types'
import { ScrollToTopButton } from '../ui/ScrollToTopButton'

interface SidebarContratosProps {
  contratos: Contrato[]
  contratoSelecionado?: number | null
  onSelectContrato: (id: number | null) => void
}

const DEFAULT_WIDTH = 240 // 25% mais estreito que os 320px originais (320px * 0.75 = 240px)
const MIN_WIDTH = 180
const MAX_WIDTH = 480

export function SidebarContratos({ contratos = [], contratoSelecionado, onSelectContrato }: SidebarContratosProps) {
  const listaContratos = Array.isArray(contratos) ? contratos : []
  const asideRef = useRef<HTMLElement>(null)

  // Ordenação por consumo (maior vs menor gasto)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>(() => {
    try {
      const saved = localStorage.getItem('shm_sidebar_sort_order')
      if (saved === 'asc' || saved === 'desc') return saved
    } catch {}
    return 'desc'
  })

  const toggleSort = () => {
    setSortOrder((prev) => {
      const next = prev === 'desc' ? 'asc' : 'desc'
      try {
        localStorage.setItem('shm_sidebar_sort_order', next)
      } catch {}
      return next
    })
  }

  const contratosOrdenados = useMemo(() => {
    return [...listaContratos].sort((a, b) => {
      const consumoA = Number(a.horas_consumidas) || 0
      const consumoB = Number(b.horas_consumidas) || 0
      if (consumoA === consumoB) {
        return (Number(a.saldo) || 0) - (Number(b.saldo) || 0)
      }
      return sortOrder === 'asc' ? consumoA - consumoB : consumoB - consumoA
    })
  }, [listaContratos, sortOrder])

  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('shm_sidebar_width')
      if (saved) {
        const parsed = Number(saved)
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed
        }
      }
    } catch {
      // Ignora erro em caso de restrição de storage
    }
    return DEFAULT_WIDTH
  })

  // Estado e handlers para redimensionamento horizontal
  const [isResizing, setIsResizing] = useState(false)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

  // Estado e handlers para rolagem vertical com clique e arraste
  const [isVerticalDragging, setIsVerticalDragging] = useState(false)
  const isVerticalMouseDownRef = useRef(false)
  const startYRef = useRef(0)
  const scrollTopRef = useRef(0)
  const hasMovedYRef = useRef(false)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  const handleResizeDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH)
    try {
      localStorage.setItem('shm_sidebar_width', String(DEFAULT_WIDTH))
    } catch {
      // Ignora erro de storage
    }
  }, [])

  const handleScrollMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('a, button, [data-resizer="true"]')) return

    isVerticalMouseDownRef.current = true
    hasMovedYRef.current = false
    startYRef.current = e.pageY - (asideRef.current?.offsetTop || 0)
    scrollTopRef.current = asideRef.current?.scrollTop || 0
  }

  const handleScrollMouseMove = (e: React.MouseEvent) => {
    if (!isVerticalMouseDownRef.current || !asideRef.current) return
    const y = e.pageY - (asideRef.current.offsetTop || 0)
    const walk = y - startYRef.current
    if (Math.abs(walk) > 4) {
      if (!isVerticalDragging) setIsVerticalDragging(true)
      hasMovedYRef.current = true
    }
    if (hasMovedYRef.current) {
      asideRef.current.scrollTop = scrollTopRef.current - walk
    }
  }

  const handleScrollMouseUp = () => {
    if (isVerticalMouseDownRef.current) {
      isVerticalMouseDownRef.current = false
      setIsVerticalDragging(false)
      setTimeout(() => {
        hasMovedYRef.current = false
      }, 50)
    }
  }

  const handleScrollMouseLeave = () => {
    if (isVerticalMouseDownRef.current) {
      isVerticalMouseDownRef.current = false
      setIsVerticalDragging(false)
      setTimeout(() => {
        hasMovedYRef.current = false
      }, 50)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = e.clientX - startXRef.current
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, MIN_WIDTH), MAX_WIDTH)
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        setIsResizing(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setWidth((currentWidth) => {
          try {
            localStorage.setItem('shm_sidebar_width', String(currentWidth))
          } catch {
            // Ignora erro de storage
          }
          return currentWidth
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <aside
      ref={asideRef}
      onMouseDown={handleScrollMouseDown}
      onMouseMove={handleScrollMouseMove}
      onMouseUp={handleScrollMouseUp}
      onMouseLeave={handleScrollMouseLeave}
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
      className={`relative w-full md:w-[var(--sidebar-width)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-3.5 shrink-0 overflow-y-auto scroll-smooth ${
        isResizing || isVerticalDragging ? 'select-none' : ''
      } ${
        isVerticalDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${
        isResizing ? '' : 'transition-[width] duration-75'
      }`}
    >
      <ScrollToTopButton
        targetRef={asideRef}
        title="Rolar para o topo dos contratos"
        className="sticky top-1 left-1/2 -translate-x-1/2 mb-1"
      />
      {/* Barra de redimensionamento (apenas desktop) */}
      <div
        data-resizer="true"
        onMouseDown={handleResizeMouseDown}
        onDoubleClick={handleResizeDoubleClick}
        title="Arraste para redimensionar ou clique duas vezes para restaurar padrão (240px)"
        className={`hidden md:flex absolute top-0 right-0 w-2 h-full cursor-col-resize z-20 items-center justify-center transition-colors group select-none ${
          isResizing ? 'bg-indigo-500/20' : 'hover:bg-indigo-500/10'
        }`}
      >
        <div
          className={`w-0.5 h-8 rounded-full transition-all ${
            isResizing
              ? 'bg-indigo-600 scale-y-125'
              : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 group-hover:scale-y-110'
          }`}
        />
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Contratos</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.2 rounded-full font-black border border-indigo-200 dark:border-indigo-800/60">
            {listaContratos.length}
          </span>
        </div>

        {/* Controle de Ordenação por Consumo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleSort()
          }}
          title={
            sortOrder === 'desc'
              ? 'Ordenado por Maior Consumo (clique para inverter para Menor Consumo)'
              : 'Ordenado por Menor Consumo (clique para inverter para Maior Consumo)'
          }
          className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
        >
          {sortOrder === 'desc' ? (
            <>
              <ArrowUp className="w-3 h-3 text-indigo-700 dark:text-indigo-400" />
              <span>Maior gasto</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-3 h-3 text-indigo-700 dark:text-indigo-400" />
              <span>Menor gasto</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2.5">
        {contratosOrdenados.map((c) => {
          const isSelected = contratoSelecionado === c.id
          const totalHoras = Number(c.horas_contratadas) || 1
          const saldo = Number(c.saldo) || 0
          const consumido = Number(c.horas_consumidas) || 0
          const percentConsumido = Math.min(Math.round((consumido / totalHoras) * 100), 100)

          return (
            <div
              key={c.id}
              onClick={() => {
                if (hasMovedYRef.current) return
                onSelectContrato(isSelected ? null : c.id)
              }}
              className={`p-3 rounded-2xl border transition-all duration-200 ${
                isVerticalDragging ? 'cursor-grabbing' : 'cursor-pointer'
              } relative ${
                isSelected
                  ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 truncate max-w-[130px]"
                  title={c.numero}
                >
                  {c.numero}
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    c.status === 'ativo'
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                      : c.status === 'expirado'
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                      : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                  }`}
                >
                  {c.status_display}
                </span>
              </div>

              <div className="text-xs font-black text-slate-900 dark:text-slate-100 mb-2 truncate" title={c.cliente_nome || ''}>
                {c.cliente_nome}
              </div>

              {/* Progress & Balances */}
              <div className="space-y-1.5 mb-2 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] font-bold">Saldo:</span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">{saldo.toFixed(1)}h</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentConsumido <= 25
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : percentConsumido <= 50
                        ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                        : percentConsumido <= 75
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-orange-500 to-rose-600'
                    }`}
                    style={{ width: `${percentConsumido}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 dark:text-slate-400 font-semibold pt-0.5">
                  <span>Gasto: {consumido.toFixed(1)}h ({percentConsumido}%)</span>
                  <span>Total: {totalHoras.toFixed(1)}h</span>
                </div>
              </div>

              {c.em_carencia && (
                <div className="mb-2 flex items-center gap-1.5 text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2 py-1 rounded-lg font-bold border border-amber-300 dark:border-amber-800/60">
                  <ShieldAlert className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Carência de 30 dias</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <Link
                  to={`/contratos/${c.id}/extrato`}
                  onClick={(e) => {
                    if (hasMovedYRef.current) {
                      e.preventDefault()
                      return
                    }
                    e.stopPropagation()
                  }}
                  className="text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1 text-[10px] group/link"
                >
                  <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover/link:scale-110 transition" />
                  <span>Extrato Detalhado</span>
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              </div>
            </div>
          )
        })}

        {listaContratos.length === 0 && (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 font-medium">
            Nenhum contrato ativo encontrado.
          </div>
        )}
      </div>
    </aside>
  )
}