import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

export function ExtratoContratoPage() {
  const { id } = useParams<{ id: string }>()
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['extrato', id],
    queryFn: () => clientService.contratos.extrato(Number(id)),
    enabled: Boolean(id),
  })

  useEffect(() => {
    const checkAtBottom = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const totalHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)

      const isWindowAtBottom = scrollY > 80 && scrollY + viewportHeight >= totalHeight - 50
      const mainEl = document.querySelector('main')
      const isMainAtBottom = mainEl && mainEl.scrollHeight > mainEl.clientHeight
        ? mainEl.scrollTop > 80 && mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 50
        : false

      setShowScrollTopBtn(isWindowAtBottom || isMainAtBottom)
    }

    window.addEventListener('scroll', checkAtBottom, { passive: true })
    window.addEventListener('resize', checkAtBottom, { passive: true })
    document.addEventListener('scroll', checkAtBottom, { passive: true })

    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.addEventListener('scroll', checkAtBottom, { passive: true })
    }

    checkAtBottom()

    return () => {
      window.removeEventListener('scroll', checkAtBottom)
      window.removeEventListener('resize', checkAtBottom)
      document.removeEventListener('scroll', checkAtBottom)
      if (mainEl) {
        mainEl.removeEventListener('scroll', checkAtBottom)
      }
    }
  }, [])

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-semibold">Carregando extrato...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Extrato não disponível.</div>
      </AppLayout>
    )
  }

  const { contrato, historico_ciclos = [] } = data
  const total = Number(contrato.horas_contratadas) || 1
  const saldo = Number(contrato.saldo) || 0
  const consumido = Number(contrato.horas_consumidas) || 0
  const percentConsumido = Math.min(Math.round((consumido / total) * 100), 100)

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700">
                  {contrato.numero}
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{contrato.cliente_nome}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">Extrato do Contrato</h1>
            </div>
            <span className="text-xs font-black px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 rounded-full uppercase tracking-wider self-start sm:self-auto">
              {contrato.status_display}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 transition-colors">
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Horas Contratadas</div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{total.toFixed(1)}h</div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Franquia total contratual</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Consumo Acumulado</div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{consumido.toFixed(1)}h</div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">{percentConsumido}% do pacote consumido</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-1 bg-gradient-to-br from-white to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/30 transition-colors">
            <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Saldo Disponível</div>
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">{saldo.toFixed(1)}h</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-300 font-bold">Disponível para novos ciclos</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Histórico de Débitos por Ciclos Aceitos</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">Registro oficial e auditável de consumo de horas técnicas</p>
            </div>
            <span className="text-xs font-black text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">{historico_ciclos.length} eventos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Pedido / Protocolo</th>
                  <th className="p-4">Tipo do Ciclo</th>
                  <th className="p-4">Escopo Técnico</th>
                  <th className="p-4 text-right">Horas Debitadas</th>
                  <th className="p-4 text-right">Data de Aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {historico_ciclos.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">{item.pedido_protocolo}</td>
                    <td className="p-4 font-bold text-indigo-700 dark:text-indigo-400">{item.tipo}</td>
                    <td className="p-4 text-slate-800 dark:text-slate-300 max-w-xs truncate">{item.contexto || '-'}</td>
                    <td className="p-4 text-right font-black text-slate-900 dark:text-slate-100 text-sm">-{item.horas_realizadas.toFixed(1)}h</td>
                    <td className="p-4 text-right text-slate-600 dark:text-slate-400 font-mono font-semibold">
                      {item.aceito_em ? new Date(item.aceito_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
                {historico_ciclos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">
                      Nenhum ciclo debitado até o momento neste contrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Topo Relatório (aparece ao atingir o fim da página) */}
      <button
        type="button"
        onClick={handleScrollToTop}
        title="Voltar ao início do relatório"
        aria-label="Topo Relatório"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-full shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-indigo-400/40 backdrop-blur-sm group ${
          showScrollTopBtn
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="hidden sm:inline">Topo Relatório</span>
        <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </AppLayout>
  )
}