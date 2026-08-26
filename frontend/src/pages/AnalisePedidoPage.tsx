import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Play, Send, Layers, MessageSquare, Loader2, Pencil, Check, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { TipoCiclo, Ciclo } from '../types'

function CicloItem({ c, apresentarOrcamentoMutation, navigate }: { c: Ciclo, apresentarOrcamentoMutation: any, navigate: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContexto, setEditContexto] = useState(c.contexto)
  const [editHoras, setEditHoras] = useState(Number(c.horas_estimadas).toString())
  const [editTipo, setEditTipo] = useState<TipoCiclo>(c.tipo as TipoCiclo)
  const toast = useToast()
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: () => clientService.ciclos.update(c.id, { contexto: editContexto, horas_estimadas: Number(editHoras), tipo: editTipo }),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      toast.success('Ciclo atualizado com sucesso!', 'Sucesso')
    },
    onError: () => toast.error('Erro ao atualizar ciclo.', 'Erro')
  })

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {!isEditing && (
            <span className="font-black text-sm text-slate-900 dark:text-white">{c.tipo_display}</span>
          )}
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-black border border-indigo-200 dark:border-indigo-800/60 uppercase tracking-wider">
            {c.status_display}
          </span>
          {c.status === 'orcado' && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-indigo-600 transition p-1">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-3 pr-4">
            <select
              value={editTipo}
              onChange={(e) => setEditTipo(e.target.value as TipoCiclo)}
              className="w-full sm:w-64 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="analise">Análise</option>
              <option value="consultoria">Consultoria</option>
              <option value="corretiva">Corretiva</option>
              <option value="evolutiva">Evolutiva</option>
              <option value="preventiva">Preventiva</option>
              <option value="teste">Teste</option>
              <option value="treinamento">Treinamento</option>
            </select>
            <textarea
              value={editContexto}
              onChange={(e) => setEditContexto(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={editHoras}
                onChange={(e) => setEditHoras(e.target.value)}
                className="w-24 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500 font-bold">horas</span>
              
              <button 
                onClick={() => updateMutation.mutate()} 
                disabled={updateMutation.isPending}
                className="ml-auto inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Salvar
              </button>
              <button 
                onClick={() => { setIsEditing(false); setEditContexto(c.contexto); setEditHoras(Number(c.horas_estimadas).toString()); setEditTipo(c.tipo as TipoCiclo) }} 
                className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg transition"
              >
                <X className="w-3 h-3" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{c.contexto}</p>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <span className="text-sm font-black text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            {Number(c.horas_estimadas).toFixed(1)}h Estimadas
          </span>
          {c.status === 'orcado' && (
            <button
              disabled={apresentarOrcamentoMutation.isPending}
              onClick={() => apresentarOrcamentoMutation.mutate({ id: c.id, horas: Number(c.horas_estimadas) })}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              {apresentarOrcamentoMutation.isPending && (apresentarOrcamentoMutation.variables as any)?.id === c.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Emitindo Orçamento...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Emitir Orçamento</span>
                </>
              )}
            </button>
          )}
          {c.status === 'aprovado' || c.status === 'em_execucao' ? (
            <button
              onClick={() => navigate(`/admin/ciclos/${c.id}/execucao`)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Ir para Execução</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function AnalisePedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [showNovoCiclo, setShowNovoCiclo] = useState(false)
  const [tipoCiclo, setTipoCiclo] = useState<TipoCiclo>('corretiva')
  const [contexto, setContexto] = useState('')
  const [horasEstimadas, setHorasEstimadas] = useState('4.0')

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => clientService.pedidos.get(Number(id)),
    enabled: Boolean(id),
    refetchInterval: 5000,
  })

  const criarCicloMutation = useMutation({
    mutationFn: clientService.ciclos.create,
    onSuccess: () => {
      setShowNovoCiclo(false)
      setContexto('')
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
      toast.success('Novo ciclo adicionado com sucesso ao chamado!', 'Ciclo Criado')
    },
    onError: () => toast.error('Erro ao adicionar ciclo.', 'Falha'),
  })

  const apresentarOrcamentoMutation = useMutation({
    mutationFn: ({ id, horas }: { id: number; horas: number }) =>
      clientService.ciclos.apresentarOrcamento(id, horas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
      toast.success('Orçamento emitido para aprovação do cliente!', 'Orçamento Emitido')
    },
    onError: () => toast.error('Erro ao emitir orçamento.', 'Falha'),
  })

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-semibold">Carregando pedido...</div>
      </AppLayout>
    )
  }

  if (!pedido) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Pedido não encontrado.</div>
      </AppLayout>
    )
  }

  const ciclos = Array.isArray(pedido.ciclos) ? pedido.ciclos : []

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel Operacional</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 shadow-sm">
                  {pedido.protocolo}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400">{pedido.cliente_nome}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pedido.assunto}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <span className="font-bold">Aberto por:</span> {pedido.criado_por_nome || 'Usuário'}
                </div>
                <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="flex items-center gap-1">
                  <span className="font-bold">Data:</span> {new Date(pedido.criado_em).toLocaleDateString('pt-BR')} às {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="flex items-center gap-1">
                  <span className="font-bold">Prioridade:</span> 
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] tracking-wider ${
                    pedido.prioridade === 'urgente' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                    pedido.prioridade === 'alta' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    pedido.prioridade === 'media' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {pedido.prioridade_display}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                to={`/pedidos/${pedido.id}`}
                className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Ver Pedido & Comentários</span>
              </Link>
              <button
                onClick={() => setShowNovoCiclo(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Ciclo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Criar Ciclo */}
        {showNovoCiclo && (
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-xl space-y-5 transition-colors">
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-black text-base">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Novo Ciclo de Atendimento</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">Tipo de Ciclo</label>
                <select
                  value={tipoCiclo}
                  onChange={(e) => setTipoCiclo(e.target.value as TipoCiclo)}
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 shadow-xs"
                >
                  <option value="analise">Análise</option>
                  <option value="consultoria">Consultoria</option>
                  <option value="corretiva">Corretiva</option>
                  <option value="evolutiva">Evolutiva</option>
                  <option value="preventiva">Preventiva</option>
                  <option value="teste">Teste</option>
                  <option value="treinamento">Treinamento</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">Horas Estimadas (Orçamento)</label>
                <input
                  type="number"
                  step="0.5"
                  value={horasEstimadas}
                  onChange={(e) => setHorasEstimadas(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 shadow-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">Contexto Técnico do Escopo</label>
              <textarea
                rows={3}
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Explique o que será executado neste recorte específico..."
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 shadow-xs"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                disabled={criarCicloMutation.isPending}
                onClick={() => setShowNovoCiclo(false)}
                className="px-4 py-2 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={!contexto.trim() || criarCicloMutation.isPending}
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
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {criarCicloMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Ciclo...</span>
                  </>
                ) : (
                  <span>Salvar Ciclo</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Ciclos List */}
        <div className="space-y-3.5">
          {ciclos.map((c) => (
            <CicloItem key={c.id} c={c} apresentarOrcamentoMutation={apresentarOrcamentoMutation} navigate={navigate} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}