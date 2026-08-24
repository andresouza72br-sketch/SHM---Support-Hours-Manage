import { useState } from 'react'
import { ChevronLeft, ChevronRight, Send, MessageSquare, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import type { Ciclo, Pedido } from '../../types'

interface CicloCarouselProps {
  pedido: Pedido
  ciclos: Ciclo[]
}

export function CicloCarousel({ pedido, ciclos }: CicloCarouselProps) {
  const { isEmpresa, canApprove } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)

  const [modalType, setModalType] = useState<'rejeitar' | 'recusar' | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [comentarioTexto, setComentarioTexto] = useState('')

  const cicloAtual = ciclos[index] || null

  const { data: rawComentarios } = useQuery({
    queryKey: ['comentarios', cicloAtual?.id],
    queryFn: () => (cicloAtual ? clientService.comunicacao.list(cicloAtual.id) : Promise.resolve([])),
    enabled: Boolean(cicloAtual),
    refetchInterval: 5000,
  })

  const comentarios = Array.isArray(rawComentarios) ? rawComentarios : []

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] })
    queryClient.invalidateQueries({ queryKey: ['comentarios', cicloAtual?.id] })
    queryClient.invalidateQueries({ queryKey: ['contratos'] })
    queryClient.invalidateQueries({ queryKey: ['kanban'] })
  }

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.aprovar(id),
    onSuccess: () => {
      refreshData()
      toast.success(`Orçamento de ${Number(cicloAtual?.horas_estimadas).toFixed(1)}h aprovado com sucesso!`, 'Orçamento Aprovado')
    },
    onError: () => toast.error('Erro ao aprovar orçamento.', 'Falha'),
  })

  const rejeitarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.ciclos.rejeitar(id, justificativa),
    onSuccess: () => {
      setModalType(null)
      setJustificativa('')
      refreshData()
      toast.info('Orçamento rejeitado com justificativa.', 'Orçamento Rejeitado')
    },
    onError: () => toast.error('Erro ao rejeitar orçamento.', 'Falha'),
  })

  const iniciarExecMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.iniciarExecucao(id),
    onSuccess: () => {
      refreshData()
      toast.success('Execução técnica iniciada com sucesso!', 'Execução')
    },
    onError: () => toast.error('Erro ao iniciar execução.', 'Falha'),
  })

  const solicitarAceiteMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.solicitarAceite(id),
    onSuccess: () => {
      refreshData()
      toast.success('Solicitação de aceite enviada ao cliente com sucesso!', 'Aceite Solicitado')
    },
    onError: () => toast.error('Erro ao solicitar aceite.', 'Falha'),
  })

  const aceitarMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.aceitar(id),
    onSuccess: () => {
      refreshData()
      toast.success(`Aceite final concedido (${Number(cicloAtual?.horas_realizadas).toFixed(1)}h debitadas do saldo)!`, 'Aceite Concluído')
    },
    onError: () => toast.error('Erro ao conceder aceite.', 'Falha'),
  })

  const recusarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.ciclos.recusar(id, justificativa),
    onSuccess: () => {
      setModalType(null)
      setJustificativa('')
      refreshData()
      toast.info('Recusa de aceite registrada com justificativa.', 'Aceite Recusado')
    },
    onError: () => toast.error('Erro ao recusar aceite.', 'Falha'),
  })

  const comentarioMutation = useMutation({
    mutationFn: ({ cicloId, texto }: { cicloId: number; texto: string }) =>
      clientService.comunicacao.create({ ciclo: cicloId, texto }),
    onSuccess: () => {
      setComentarioTexto('')
      refreshData()
      toast.success('Comentário publicado no ciclo com sucesso!', 'Comunicação')
    },
    onError: () => toast.error('Erro ao enviar comentário.', 'Falha'),
  })

  if (!cicloAtual) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 text-slate-400 text-sm font-medium shadow-xs">
        Nenhum ciclo cadastrado para este pedido ainda.
      </div>
    )
  }

  const tarefas = Array.isArray(cicloAtual.tarefas) ? cicloAtual.tarefas : []

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xs shadow-indigo-500/20">
            Ciclo {index + 1} de {ciclos.length}
          </span>
          <span className="font-extrabold text-slate-900 text-base sm:text-lg">{cicloAtual.tipo_display}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Ciclo Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <button
            disabled={index === ciclos.length - 1}
            onClick={() => setIndex((prev) => Math.min(prev + 1, ciclos.length - 1))}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Próximo Ciclo"
          >
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Ciclo Detail Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5 flex-1">
            <div className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Escopo Técnico do Ciclo</div>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">{cicloAtual.contexto || 'Sem contexto detalhado.'}</p>
          </div>

          <div className="flex items-center gap-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 self-start lg:self-auto">
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase">Estimadas</div>
              <div className="text-lg font-black text-slate-700">{Number(cicloAtual.horas_estimadas).toFixed(1)}h</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase">Realizadas</div>
              <div className="text-lg font-black text-indigo-600">{Number(cicloAtual.horas_realizadas).toFixed(1)}h</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase">Status</div>
              <span className="inline-block mt-0.5 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                {cicloAtual.status_display}
              </span>
            </div>
          </div>
        </div>

        {/* Tarefas List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Tarefas & Apontamentos Realizados</h4>
            <span className="text-xs font-bold text-slate-500">{tarefas.length} tarefas</span>
          </div>

          <div className="space-y-2.5">
            {tarefas.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-sm gap-2 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.status === 'realizada' ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-400 ring-2 ring-amber-100'}`} />
                  <span className="font-semibold text-slate-800">{t.descricao}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                  <span className="text-slate-400 font-medium">Est: {Number(t.horas_estimadas).toFixed(1)}h</span>
                  <span className="text-indigo-600 font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    Gasto: {Number(t.horas_realizadas).toFixed(1)}h
                  </span>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                Nenhuma tarefa apontada neste ciclo até o momento.
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>Operador Técnico:</span>
            <strong className="text-slate-800 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
              {cicloAtual.operador_nome || 'A definir'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            {/* Ações Cliente */}
            {canApprove && cicloAtual.status === 'aguardando_aprovacao' && (
              <>
                <button
                  onClick={() => setModalType('rejeitar')}
                  className="px-4 py-2.5 text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  onClick={() => aprovarMutation.mutate(cicloAtual.id)}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  Aprovar Orçamento ({Number(cicloAtual.horas_estimadas).toFixed(1)}h)
                </button>
              </>
            )}

            {canApprove && cicloAtual.status === 'aguardando_aceite' && (
              <>
                <button
                  onClick={() => setModalType('recusar')}
                  className="px-4 py-2.5 text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                >
                  Recusar Aceite
                </button>
                <button
                  onClick={() => aceitarMutation.mutate(cicloAtual.id)}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  Conceder Aceite Final ({Number(cicloAtual.horas_realizadas).toFixed(1)}h)
                </button>
              </>
            )}

            {/* Ações Técnico */}
            {isEmpresa && cicloAtual.status === 'aprovado' && (
              <button
                onClick={() => iniciarExecMutation.mutate(cicloAtual.id)}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                Iniciar Execução Técnica
              </button>
            )}

            {isEmpresa && cicloAtual.status === 'em_execucao' && (
              <button
                onClick={() => solicitarAceiteMutation.mutate(cicloAtual.id)}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition cursor-pointer"
              >
                Solicitar Aceite ao Cliente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Justificativa */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>{modalType === 'rejeitar' ? 'Rejeitar Orçamento' : 'Recusar Aceite de Conclusão'}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Por favor, informe a justificativa técnica para que nossa equipe possa reavaliar o escopo e realizar os ajustes necessários:
            </p>
            <textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da recusa ou pendências identificadas..."
              className="w-full text-xs p-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-medium"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setModalType(null)
                  setJustificativa('')
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={!justificativa.trim()}
                onClick={() => {
                  if (modalType === 'rejeitar') {
                    rejeitarMutation.mutate({ id: cicloAtual.id, justificativa })
                  } else {
                    recusarMutation.mutate({ id: cicloAtual.id, justificativa })
                  }
                }}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40 shadow-sm cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comentários Thread */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Comentários & Histórico do Ciclo</span>
          </div>
          <span className="text-xs font-bold text-slate-400">{comentarios.length} mensagens</span>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {comentarios.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{c.autor_nome}</span>
                  <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                    {c.autor_role?.split('—')[0] || c.autor_role}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">
                  {c.criado_em ? new Date(c.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">{c.texto}</p>
            </div>
          ))}

          {comentarios.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Nenhuma mensagem registrada neste ciclo.
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (comentarioTexto.trim() && cicloAtual) {
              comentarioMutation.mutate({ cicloId: cicloAtual.id, texto: comentarioTexto.trim() })
            }
          }}
          className="flex gap-2.5 pt-3 border-t border-slate-100"
        >
          <input
            type="text"
            value={comentarioTexto}
            onChange={(e) => setComentarioTexto(e.target.value)}
            placeholder="Escreva uma mensagem ou observação sobre este ciclo..."
            className="flex-1 text-xs bg-slate-50 border border-slate-300/80 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
          <button
            type="submit"
            disabled={!comentarioTexto.trim()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-3 rounded-2xl disabled:opacity-40 transition cursor-pointer shadow-sm shadow-indigo-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}