import { useState } from 'react'
import { ChevronLeft, ChevronRight, Send, MessageSquare } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import type { Ciclo, Pedido } from '../../types'

interface CicloCarouselProps {
  pedido: Pedido
  ciclos: Ciclo[]
}

export function CicloCarousel({ pedido, ciclos }: CicloCarouselProps) {
  const { isEmpresa, canApprove } = useAuth()
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)

  const [modalType, setModalType] = useState<'rejeitar' | 'recusar' | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [comentarioTexto, setComentarioTexto] = useState('')

  const cicloAtual = ciclos[index] || null

  const { data: comentarios = [] } = useQuery({
    queryKey: ['comentarios', cicloAtual?.id],
    queryFn: () => (cicloAtual ? clientService.comunicacao.list(cicloAtual.id) : Promise.resolve([])),
    enabled: Boolean(cicloAtual),
  })

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] })
    queryClient.invalidateQueries({ queryKey: ['comentarios', cicloAtual?.id] })
    queryClient.invalidateQueries({ queryKey: ['contratos'] })
    queryClient.invalidateQueries({ queryKey: ['kanban'] })
  }

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.aprovar(id),
    onSuccess: refreshData,
  })

  const rejeitarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.ciclos.rejeitar(id, justificativa),
    onSuccess: () => {
      setModalType(null)
      setJustificativa('')
      refreshData()
    },
  })

  const iniciarExecMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.iniciarExecucao(id),
    onSuccess: refreshData,
  })

  const solicitarAceiteMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.solicitarAceite(id),
    onSuccess: refreshData,
  })

  const aceitarMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.aceitar(id),
    onSuccess: refreshData,
  })

  const recusarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.ciclos.recusar(id, justificativa),
    onSuccess: () => {
      setModalType(null)
      setJustificativa('')
      refreshData()
    },
  })

  const comentarioMutation = useMutation({
    mutationFn: ({ cicloId, texto }: { cicloId: number; texto: string }) =>
      clientService.comunicacao.create({ ciclo: cicloId, texto }),
    onSuccess: () => {
      setComentarioTexto('')
      refreshData()
    },
  })

  if (!cicloAtual) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
        Nenhum ciclo cadastrado para este pedido ainda.
      </div>
    )
  }

  const tarefas = cicloAtual.tarefas || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase tracking-wider">
            Ciclo {index + 1} de {ciclos.length}
          </span>
          <span className="font-bold text-slate-800 text-base">{cicloAtual.tipo_display}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <button
            disabled={index === ciclos.length - 1}
            onClick={() => setIndex((prev) => Math.min(prev + 1, ciclos.length - 1))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Escopo Técnico</div>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">{cicloAtual.contexto || 'Sem contexto detalhado.'}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Estimadas</div>
              <div className="text-lg font-black text-slate-700">{Number(cicloAtual.horas_estimadas).toFixed(1)}h</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Realizadas</div>
              <div className="text-lg font-black text-indigo-600">{Number(cicloAtual.horas_realizadas).toFixed(1)}h</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Status</div>
              <span className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                {cicloAtual.status_display}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tarefas do Ciclo</h4>
          <div className="space-y-2">
            {tarefas.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${t.status === 'realizada' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="font-medium text-slate-800">{t.descricao}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-slate-500">Estimado: {t.horas_estimadas}h</span>
                  <span className="text-indigo-600 font-black">Gasto: {t.horas_realizadas}h</span>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                Nenhuma tarefa lançada neste ciclo.
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Responsável: <strong className="text-slate-700 font-bold">{cicloAtual.operador_nome || 'A definir'}</strong>
          </div>

          <div className="flex items-center gap-3">
            {canApprove && cicloAtual.status === 'aguardando_aprovacao' && (
              <>
                <button
                  onClick={() => setModalType('rejeitar')}
                  className="px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  onClick={() => aprovarMutation.mutate(cicloAtual.id)}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
                >
                  Aprovar Orçamento
                </button>
              </>
            )}

            {canApprove && cicloAtual.status === 'aguardando_aceite' && (
              <>
                <button
                  onClick={() => setModalType('recusar')}
                  className="px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                >
                  Recusar Aceite
                </button>
                <button
                  onClick={() => aceitarMutation.mutate(cicloAtual.id)}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                >
                  Conceder Aceite Final ({Number(cicloAtual.horas_realizadas).toFixed(1)}h)
                </button>
              </>
            )}

            {isEmpresa && cicloAtual.status === 'aprovado' && (
              <button
                onClick={() => iniciarExecMutation.mutate(cicloAtual.id)}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
              >
                Iniciar Execução Técnica
              </button>
            )}

            {isEmpresa && cicloAtual.status === 'em_execucao' && (
              <button
                onClick={() => solicitarAceiteMutation.mutate(cicloAtual.id)}
                className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition"
              >
                Solicitar Aceite ao Cliente
              </button>
            )}
          </div>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {modalType === 'rejeitar' ? 'Rejeitar Orçamento' : 'Recusar Aceite de Conclusão'}
            </h3>
            <p className="text-xs text-slate-500">
              Por favor, informe a justificativa ou pendência técnica para que nossa equipe possa reavaliar o ciclo:
            </p>
            <textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da recusa..."
              className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setModalType(null)
                  setJustificativa('')
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
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
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Comentários e Histórico do Ciclo</span>
        </h4>

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {comentarios.map((c) => (
            <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  {c.autor_nome} <span className="text-slate-400 font-normal">({c.autor_role})</span>
                </span>
                <span className="text-slate-400">{new Date(c.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-700">{c.texto}</p>
            </div>
          ))}

          {comentarios.length === 0 && (
            <div className="p-4 text-center text-slate-400 text-xs italic">
              Nenhum comentário registrado.
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
          className="flex gap-2 pt-2 border-t border-slate-100"
        >
          <input
            type="text"
            value={comentarioTexto}
            onChange={(e) => setComentarioTexto(e.target.value)}
            placeholder="Escreva uma mensagem ou observação sobre este ciclo..."
            className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!comentarioTexto.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl disabled:opacity-40 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}