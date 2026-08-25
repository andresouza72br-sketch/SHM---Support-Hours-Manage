import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  AlertTriangle,
  Pencil,
  Trash2,
  Check,
  X,
  User as UserIcon,
  Loader2,
} from 'lucide-react'
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
  const { user, isEmpresa, canApprove } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)

  const [modalType, setModalType] = useState<'rejeitar' | 'recusar' | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [comentarioTexto, setComentarioTexto] = useState('')

  // Estados para edição e exclusão de comentários
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  const cicloAtual = ciclos[index] || null

  const { data: rawComentarios } = useQuery({
    queryKey: ['comentarios', cicloAtual?.id],
    queryFn: () => (cicloAtual ? clientService.comunicacao.list(cicloAtual.id) : Promise.resolve([])),
    enabled: Boolean(cicloAtual),
    refetchInterval: 4000,
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

  const editarComentarioMutation = useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) =>
      clientService.comunicacao.update(id, { texto }),
    onSuccess: () => {
      setEditingCommentId(null)
      setEditingCommentText('')
      refreshData()
      toast.success('Comentário editado com sucesso!', 'Comentário Atualizado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao editar comentário. Apenas o autor pode alterá-lo.'
      toast.error(msg, 'Falha')
    },
  })

  const excluirComentarioMutation = useMutation({
    mutationFn: (id: string) => clientService.comunicacao.delete(id),
    onSuccess: () => {
      setDeletingCommentId(null)
      refreshData()
      toast.success('Comentário excluído com sucesso!', 'Comentário Removido')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao excluir comentário. Apenas o autor pode apagá-lo.'
      toast.error(msg, 'Falha')
    },
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
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xs shadow-indigo-500/20">
            Ciclo {index + 1} de {ciclos.length}
          </span>
          <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{cicloAtual.tipo_display}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Ciclo Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-slate-800 dark:text-slate-300" />
          </button>
          <button
            disabled={index === ciclos.length - 1}
            onClick={() => setIndex((prev) => Math.min(prev + 1, ciclos.length - 1))}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Próximo Ciclo"
          >
            <ChevronRight className="w-5 h-5 text-slate-800 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Ciclo Detail Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5 flex-1">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">Escopo Técnico do Ciclo</div>
            <p className="text-slate-900 dark:text-slate-100 font-medium text-sm leading-relaxed">{cicloAtual.contexto || 'Sem contexto detalhado.'}</p>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 self-start lg:self-auto">
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase">Estimadas</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{Number(cicloAtual.horas_estimadas).toFixed(1)}h</div>
            </div>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase">Realizadas</div>
              <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">{Number(cicloAtual.horas_realizadas).toFixed(1)}h</div>
            </div>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase">Status</div>
              <span className="inline-block mt-0.5 text-[11px] font-black px-3 py-1 rounded-full uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {cicloAtual.status_display}
              </span>
            </div>
          </div>
        </div>

        {/* Tarefas List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tarefas & Apontamentos Realizados</h4>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-400">{tarefas.length} tarefas</span>
          </div>

          <div className="space-y-2.5">
            {tarefas.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-sm gap-2 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.status === 'realizada' ? 'bg-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-950' : 'bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-950'}`} />
                  <span className="font-bold text-slate-900 dark:text-slate-100">{t.descricao}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Est: {Number(t.horas_estimadas).toFixed(1)}h</span>
                  <span className="text-indigo-800 dark:text-indigo-300 font-black bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
                    Gasto: {Number(t.horas_realizadas).toFixed(1)}h
                  </span>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                Nenhuma tarefa apontada neste ciclo até o momento.
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Operador Técnico:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
              {cicloAtual.operador_nome || 'A definir'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            {/* Ações Cliente */}
            {canApprove && cicloAtual.status === 'aguardando_aprovacao' && (
              <>
                <button
                  disabled={aprovarMutation.isPending}
                  onClick={() => setModalType('rejeitar')}
                  className="px-4 py-2.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  disabled={aprovarMutation.isPending}
                  onClick={() => aprovarMutation.mutate(cicloAtual.id)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                >
                  {aprovarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aprovando Orçamento...</span>
                    </>
                  ) : (
                    <span>Aprovar Orçamento ({Number(cicloAtual.horas_estimadas).toFixed(1)}h)</span>
                  )}
                </button>
              </>
            )}

            {canApprove && cicloAtual.status === 'aguardando_aceite' && (
              <>
                <button
                  disabled={aceitarMutation.isPending}
                  onClick={() => setModalType('recusar')}
                  className="px-4 py-2.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recusar Aceite
                </button>
                <button
                  disabled={aceitarMutation.isPending}
                  onClick={() => aceitarMutation.mutate(cicloAtual.id)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                >
                  {aceitarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Concedendo Aceite Final...</span>
                    </>
                  ) : (
                    <span>Conceder Aceite Final ({Number(cicloAtual.horas_realizadas).toFixed(1)}h)</span>
                  )}
                </button>
              </>
            )}

            {/* Ações Técnico */}
            {isEmpresa && cicloAtual.status === 'aprovado' && (
              <button
                disabled={iniciarExecMutation.isPending}
                onClick={() => iniciarExecMutation.mutate(cicloAtual.id)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {iniciarExecMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando Execução Técnica...</span>
                  </>
                ) : (
                  <span>Iniciar Execução Técnica</span>
                )}
              </button>
            )}

            {isEmpresa && cicloAtual.status === 'em_execucao' && (
              <button
                disabled={solicitarAceiteMutation.isPending}
                onClick={() => solicitarAceiteMutation.mutate(cicloAtual.id)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {solicitarAceiteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Solicitando Aceite ao Cliente...</span>
                  </>
                ) : (
                  <span>Solicitar Aceite ao Cliente</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Justificativa */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>{modalType === 'rejeitar' ? 'Rejeitar Orçamento' : 'Recusar Aceite de Conclusão'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Por favor, informe a justificativa técnica para que nossa equipe possa reavaliar o escopo e realizar os ajustes necessários:
            </p>
            <textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da recusa ou pendências identificadas..."
              className="w-full text-xs p-3.5 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                disabled={rejeitarMutation.isPending || recusarMutation.isPending}
                onClick={() => {
                  setModalType(null)
                  setJustificativa('')
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={!justificativa.trim() || rejeitarMutation.isPending || recusarMutation.isPending}
                onClick={() => {
                  if (modalType === 'rejeitar') {
                    rejeitarMutation.mutate({ id: cicloAtual.id, justificativa })
                  } else {
                    recusarMutation.mutate({ id: cicloAtual.id, justificativa })
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 disabled:cursor-wait shadow-sm cursor-pointer"
              >
                {rejeitarMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejeitando Orçamento...</span>
                  </>
                ) : recusarMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recusando Aceite...</span>
                  </>
                ) : (
                  <span>Confirmar Recusa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão de Comentário */}
      {deletingCommentId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-base">
              <Trash2 className="w-5 h-5" />
              <span>Excluir Comentário</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Tem certeza que deseja apagar este comentário? Esta ação não pode ser desfeita e ele será removido do histórico do ciclo para todos os usuários.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingCommentId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={excluirComentarioMutation.isPending}
                onClick={() => excluirComentarioMutation.mutate(deletingCommentId)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 disabled:cursor-wait shadow-sm cursor-pointer"
              >
                {excluirComentarioMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo Comentário...</span>
                  </>
                ) : (
                  <span>Confirmar Exclusão</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comentários Thread */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Comentários & Histórico do Ciclo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Visível para Empresa e Cliente
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {comentarios.length} {comentarios.length === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </div>
        </div>

        {/* Lista de Comentários */}
        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
          {comentarios.map((c) => {
            const isOwner = Boolean(
              user &&
              (c.autor === user.id ||
                (c.autor_username && c.autor_username === user.username) ||
                (c.autor_nome && user.first_name && c.autor_nome.toLowerCase().includes(user.first_name.toLowerCase())))
            )
            const isEditing = editingCommentId === c.id
            const isUpdated = Boolean(c.atualizado_em && c.criado_em && c.atualizado_em !== c.criado_em)

            const formattedDate = c.criado_em
              ? new Date(c.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-'

            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border text-xs transition duration-150 space-y-2.5 ${
                  isOwner
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70'
                }`}
              >
                {/* Header do Comentário */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.autor_avatar_url ? (
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <img
                          src={c.autor_avatar_url}
                          alt={c.autor_nome || 'Avatar'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-[10px] flex items-center justify-center shrink-0">
                        {c.autor_nome ? c.autor_nome[0].toUpperCase() : <UserIcon className="w-3 h-3" />}
                      </div>
                    )}
                    <span className="font-black text-slate-900 dark:text-white">{c.autor_nome}</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-600">
                      {c.autor_role?.split('—')[0] || c.autor_role}
                    </span>
                    {isOwner && (
                      <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Você
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-semibold">
                      <span>{formattedDate}</span>
                      {isUpdated && <span className="text-slate-500 italic font-sans">(editado)</span>}
                    </div>

                    {/* Botões de Ação para o Dono do Comentário */}
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCommentId(c.id)
                            setEditingCommentText(c.texto)
                          }}
                          className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-slate-750 rounded-lg transition cursor-pointer"
                          title="Editar meu comentário"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCommentId(c.id)}
                          className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Excluir meu comentário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Comentário / Modo de Edição */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={3}
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCommentId(null)
                          setEditingCommentText('')
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancelar</span>
                      </button>
                      <button
                        disabled={!editingCommentText.trim() || editarComentarioMutation.isPending}
                        onClick={() => {
                          if (editingCommentText.trim()) {
                            editarComentarioMutation.mutate({ id: c.id, texto: editingCommentText.trim() })
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                      >
                        {editarComentarioMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Salvando Alteração...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Salvar Alteração</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">{c.texto}</p>
                )}
              </div>
            )
          })}

          {comentarios.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              Nenhuma mensagem registrada neste ciclo até o momento. Todos os usuários da empresa e do cliente podem comentar abaixo.
            </div>
          )}
        </div>

        {/* Formulário de Novo Comentário */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (comentarioTexto.trim() && cicloAtual) {
              comentarioMutation.mutate({ cicloId: cicloAtual.id, texto: comentarioTexto.trim() })
            }
          }}
          className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <input
            type="text"
            disabled={comentarioMutation.isPending}
            value={comentarioTexto}
            onChange={(e) => setComentarioTexto(e.target.value)}
            placeholder={comentarioMutation.isPending ? 'Enviando comentário...' : 'Escreva uma mensagem ou observação sobre este ciclo (visível para todos)...'}
            className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!comentarioTexto.trim() || comentarioMutation.isPending}
            className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-3 rounded-2xl disabled:opacity-50 disabled:cursor-wait transition cursor-pointer shadow-sm shadow-indigo-500/20 shrink-0"
            title={comentarioMutation.isPending ? 'Enviando comentário...' : 'Publicar Comentário'}
          >
            {comentarioMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}