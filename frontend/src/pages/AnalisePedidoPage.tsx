import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Play, Send } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import type { TipoCiclo } from '../types'

export function AnalisePedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showNovoCiclo, setShowNovoCiclo] = useState(false)
  const [tipoCiclo, setTipoCiclo] = useState<TipoCiclo>('corretiva')
  const [contexto, setContexto] = useState('')
  const [horasEstimadas, setHorasEstimadas] = useState('4.0')

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => clientService.pedidos.get(Number(id)),
    enabled: Boolean(id),
  })

  const criarCicloMutation = useMutation({
    mutationFn: clientService.ciclos.create,
    onSuccess: () => {
      setShowNovoCiclo(false)
      setContexto('')
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
    },
  })

  const apresentarOrcamentoMutation = useMutation({
    mutationFn: ({ id, horas }: { id: number; horas: number }) =>
      clientService.ciclos.apresentarOrcamento(id, horas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedido', id] }),
  })

  if (isLoading) return <div className="p-12 text-center text-slate-400">Carregando pedido...</div>
  if (!pedido) return <div className="p-12 text-center text-rose-500 font-bold">Pedido não encontrado.</div>

  const ciclos = pedido.ciclos || []

  return (
    <AppLayout showSidebar={false}>
      {() => (
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel Operacional</span>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {pedido.protocolo}
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-2">{pedido.assunto}</h1>
              </div>
              <button
                onClick={() => setShowNovoCiclo(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Ciclo</span>
              </button>
            </div>
          </div>

          {showNovoCiclo && (
            <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-md space-y-4">
              <h3 className="font-bold text-base text-slate-900">Novo Ciclo de Atendimento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Ciclo</label>
                  <select
                    value={tipoCiclo}
                    onChange={(e) => setTipoCiclo(e.target.value as TipoCiclo)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  >
                    <option value="corretiva">Corretiva</option>
                    <option value="evolutiva">Evolutiva</option>
                    <option value="preventiva">Preventiva</option>
                    <option value="analise">Análise</option>
                    <option value="consultoria">Consultoria</option>
                    <option value="treinamento">Treinamento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horas Estimadas (Orçamento)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={horasEstimadas}
                    onChange={(e) => setHorasEstimadas(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contexto Técnico do Escopo</label>
                <textarea
                  rows={3}
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="Explique o que será executado neste recorte..."
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNovoCiclo(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (user && contexto.trim()) {
                      criarCicloMutation.mutate({
                        pedido: pedido.id,
                        tipo: tipoCiclo,
                        contexto: contexto.trim(),
                        operador: user.id,
                        horas_estimadas: Number(horasEstimadas),
                      })
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Salvar Ciclo
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {ciclos.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900">{c.tipo_display}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{c.status_display}</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.contexto}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-800">{c.horas_estimadas}h est.</span>
                  {c.status === 'orcado' && (
                    <button
                      onClick={() => apresentarOrcamentoMutation.mutate({ id: c.id, horas: Number(c.horas_estimadas) })}
                      className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Emitir Orçamento</span>
                    </button>
                  )}
                  {c.status === 'aprovado' || c.status === 'em_execucao' ? (
                    <button
                      onClick={() => navigate(`/admin/ciclos/${c.id}/execucao`)}
                      className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Ir para Execução</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}