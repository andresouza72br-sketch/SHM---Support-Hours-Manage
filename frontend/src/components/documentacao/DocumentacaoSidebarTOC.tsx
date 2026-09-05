import { useRef, useState, useEffect, type ComponentType } from 'react'
import { BookOpen, ShieldCheck, Cpu, Code2, Search, Terminal, Scale, ChevronRight } from 'lucide-react'
import { type TopicoDocumentacao } from '../../types'

export const TOPICOS_DOCUMENTACAO: (TopicoDocumentacao & { icone: ComponentType<{ className?: string }> })[] = [
  {
    id: 'fundamentos-shm',
    numero: 1,
    titulo: 'Fundamentos e Defesa do SHM',
    subtitulo: 'Por que o SHM valoriza a auditoria e a proteção mútua',
    nivel: 'visao-geral',
    icone: ShieldCheck,
  },
  {
    id: 'workflow-auditoria',
    numero: 2,
    titulo: 'Workflow da Auditoria',
    subtitulo: 'Ciclo de vida do registro transacional em 7 etapas',
    nivel: 'visao-geral',
    icone: BookOpen,
  },
  {
    id: 'tecnologias-imutabilidade',
    numero: 3,
    titulo: 'Tecnologias e Imutabilidade',
    subtitulo: 'RFC 8785, SHA-256 e gatilhos nativos PostgreSQL',
    nivel: 'visao-geral',
    icone: Cpu,
  },
  {
    id: 'exemplos-praticos',
    numero: 4,
    titulo: 'Exemplos Práticos',
    subtitulo: 'Demonstração de payloads e detecção de quebra',
    nivel: 'visao-geral',
    icone: Code2,
  },
  {
    id: 'protocolo-pericial',
    numero: 5,
    titulo: 'Protocolo Pericial e Varredura Policial',
    subtitulo: 'Roteiro de auditoria para forças de investigação',
    nivel: 'tecnico-pericial',
    icone: Search,
  },
  {
    id: 'script-autocontido',
    numero: 6,
    titulo: 'Script Autocontido Offline',
    subtitulo: 'Download de ferramenta autônoma para perícias isoladas',
    nivel: 'tecnico-pericial',
    icone: Terminal,
  },
  {
    id: 'legislacao-certificacoes',
    numero: 7,
    titulo: 'Legislação e Normas',
    subtitulo: 'Cadeia de Custódia (CPP), CPC 411/422 e ISO/IEC 27037',
    nivel: 'tecnico-pericial',
    icone: Scale,
  },
]

interface DocumentacaoSidebarTOCProps {
  topicoAtivo: string
  onSelectTopico: (id: string) => void
}

export function DocumentacaoSidebarTOC({ topicoAtivo, onSelectTopico }: DocumentacaoSidebarTOCProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [topOffset, setTopOffset] = useState<string>('calc(50vh - 240px)')

  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight
        if (height > 0) {
          const halfHeight = Math.round(height / 2)
          setTopOffset(`max(5rem, calc(50vh - ${halfHeight}px))`)
        }
      }
    }

    updatePosition()
    const rafId = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:h-full">
      {/* Versão Desktop (Flutuante Fixo Centralizado Verticalmente) */}
      <div
        ref={containerRef}
        style={{ top: topOffset }}
        className="hidden lg:block sticky z-20 transition-[top] duration-150"
      >
        <div className="p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/60 max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Índice da Documentação
            </h3>
          </div>

          <nav className="space-y-1.5" aria-label="Tópicos da documentação">
            {TOPICOS_DOCUMENTACAO.map((t) => {
              const Icone = t.icone
              const isAtivo = topicoAtivo === t.id
              const isTecnico = t.nivel === 'tecnico-pericial'

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTopico(t.id)}
                  className={`w-full group text-left p-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                    isAtivo
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${
                      isAtivo
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  >
                    <Icone className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t.numero.toString().padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                          isTecnico
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40'
                        }`}
                      >
                        {isTecnico ? 'Pericial' : 'Geral'}
                      </span>
                    </div>
                    <div className="text-xs font-bold leading-snug line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {t.titulo}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight line-clamp-1 mt-0.5">
                      {t.subtitulo}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-medium">Certificação Lógica</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">RFC 8785 / SHA-256</span>
          </div>
        </div>
      </div>

      {/* Versão Mobile (Dropdown seletor no topo) */}
      <div className="block lg:hidden mb-6">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label htmlFor="mobile-toc" className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Navegar pelos Tópicos da Documentação:
          </label>
          <div className="relative">
            <select
              id="mobile-toc"
              value={topicoAtivo}
              onChange={(e) => onSelectTopico(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {TOPICOS_DOCUMENTACAO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}. {t.titulo} ({t.nivel === 'tecnico-pericial' ? 'Pericial' : 'Geral'})
                </option>
              ))}
            </select>
            <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>
    </aside>
  )
}
