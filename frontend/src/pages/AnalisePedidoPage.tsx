import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Play,
  Send,
  Layers,
  MessageSquare,
  Loader2,
  Pencil,
  Check,
  X,
  Paperclip,
  Download,
  Music,
  Image as ImageIcon,
  Archive,
  FileText,
  GripVertical,
  Building2,
  Calendar,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ModalAgendamento } from '../components/schedule/ModalAgendamento'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { TipoCiclo, Ciclo, AnexoPedido, TipoEventoSchedule } from '../types'

function formatarTamanho(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Music className="w-3.5 h-3.5 text-violet-500 shrink-0" />
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
  }
  return <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
}

function CicloItem({
  c,
  apresentarOrcamentoMutation,
  navigate,
  todosAnexosPedido,
}: {
  c: Ciclo
  apresentarOrcamentoMutation: any
  navigate: any
  todosAnexosPedido: AnexoPedido[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContexto, setEditContexto] = useState(c.contexto)
  const [editHoras, setEditHoras] = useState(Number(c.horas_estimadas).toString())
  const [editTipo, setEditTipo] = useState<TipoCiclo>(c.tipo as TipoCiclo)
  const [isDragOver, setIsDragOver] = useState(false)
  const toast = useToast()
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: () =>
      clientService.ciclos.update(c.id, {
        contexto: editContexto,
        horas_estimadas: Number(editHoras),
        tipo: editTipo,
      }),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      toast.success('Ciclo atualizado com sucesso!', 'Sucesso')
    },
    onError: () => toast.error('Erro ao atualizar ciclo.', 'Erro'),
  })

  const referenciarMutation = useMutation({
    mutationFn: (anexoId: number) => clientService.ciclos.referenciarAnexo(c.id, anexoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      toast.success('Documento vinculado a este ciclo com sucesso!', 'Documento Vinculado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Erro ao vincular anexo ao ciclo.', 'Falha')
    },
  })

  const desvincularMutation = useMutation({
    mutationFn: (anexoId: number) => clientService.ciclos.desvincularAnexo(c.id, anexoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      toast.info('Documento desvinculado deste ciclo.', 'Desvinculado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Erro ao desvincular anexo.', 'Falha')
    },
  })

  const reenviarMagicLinkMutation = useMutation({
    mutationFn: () => clientService.ciclos.reenviarMagicLink(c.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      toast.success(data.detail || 'Magic Link reenviado com sucesso por e-mail!', 'Link Reenviado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao reenviar Magic Link.'
      toast.error(msg, 'Falha no Reenvio')
    },
  })

  const anexosReferenciadosIds = new Set(c.anexos_referenciados?.map((a) => a.id) || [])
  const anexosDisponiveisParaVincular = todosAnexosPedido.filter(
    (a) => !anexosReferenciadosIds.has(a.id)
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const anexoIdStr = e.dataTransfer.getData('anexo_id') || e.dataTransfer.getData('text/plain')
        if (anexoIdStr) {
          const anexoId = Number(anexoIdStr)
          if (!isNaN(anexoId)) {
            referenciarMutation.mutate(anexoId)
          }
        }
      }}
      className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between gap-4 transition-all ${
        isDragOver
          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.01]'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      {isDragOver && (
        <div className="w-full py-2 px-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 border border-dashed border-indigo-400 text-indigo-800 dark:text-indigo-200 text-xs font-bold text-center animate-pulse">
          Solte o documento aqui para vincular ao escopo deste ciclo
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {!isEditing && (
              <span className="font-black text-sm text-slate-900 dark:text-white">{c.tipo_display}</span>
            )}
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-black border border-indigo-200 dark:border-indigo-800/60 uppercase tracking-wider">
              {c.status_display}
            </span>
            {c.status === 'orcado' && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-indigo-600 transition p-1"
              >
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
                value={editContexto || ''}
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
                  {updateMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditContexto(c.contexto)
                    setEditHoras(Number(c.horas_estimadas).toString())
                    setEditTipo(c.tipo as TipoCiclo)
                  }}
                  className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {c.contexto}
            </p>
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
                onClick={() =>
                  apresentarOrcamentoMutation.mutate({ id: c.id, horas: Number(c.horas_estimadas) })
                }
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {apresentarOrcamentoMutation.isPending &&
                (apresentarOrcamentoMutation.variables as any)?.id === c.id ? (
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
            {(c.status === 'aguardando_aprovacao' || c.status === 'aguardando_aceite') && (
              <button
                disabled={reenviarMagicLinkMutation.isPending}
                onClick={() => reenviarMagicLinkMutation.mutate()}
                className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait shadow-2xs"
                title={`Renovar token seguro e redisparar e-mail (${c.status_display})`}
              >
                {reenviarMagicLinkMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reenviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Reenviar Magic Link</span>
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

      {/* Seção de Documentos Vinculados ao Ciclo */}
      <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
            <span>Documentos Vinculados ao Ciclo ({c.anexos_referenciados?.length || 0})</span>
          </div>

          {anexosDisponiveisParaVincular.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  referenciarMutation.mutate(Number(e.target.value))
                  e.target.value = ''
                }
              }}
              disabled={referenciarMutation.isPending}
              className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                + Vincular documento do pedido...
              </option>
              {anexosDisponiveisParaVincular.map((a) => (
                <option key={a.id} value={a.id}>
                  + {a.nome_original}
                </option>
              ))}
            </select>
          )}
        </div>

        {c.anexos_referenciados && c.anexos_referenciados.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {c.anexos_referenciados.map((anexo) => (
              <div
                key={anexo.id}
                className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 shadow-2xs group"
              >
                {getIconeArquivo(anexo.nome_original)}
                <span
                  className="font-semibold text-xs truncate max-w-[140px] sm:max-w-[200px]"
                  title={anexo.nome_original}
                >
                  {anexo.nome_original}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  ({formatarTamanho(anexo.tamanho)})
                </span>
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-1 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition"
                  title="Baixar arquivo"
                >
                  <Download className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  disabled={desvincularMutation.isPending}
                  onClick={() => desvincularMutation.mutate(anexo.id)}
                  className="p-1 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded transition cursor-pointer"
                  title="Desvincular deste ciclo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic">
            Nenhum documento vinculado. Arraste um arquivo do painel de anexos acima para este card para associá-lo.
          </p>
        )}
      </div>
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
  const [selectedAnexosIds, setSelectedAnexosIds] = useState<number[]>([])

  // Estado do Modal de Agendamento (Schedule)
  const [modalAgendamentoOpen, setModalAgendamentoOpen] = useState(false)
  const [agendamentoContexto, setAgendamentoContexto] = useState<{
    cicloId?: number
    cicloTipo?: string
    tipoSugerido?: TipoEventoSchedule
    tituloSugerido?: string
  }>({})

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
      setSelectedAnexosIds([])
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
      toast.success('Novo ciclo adicionado com sucesso ao pedido!', 'Ciclo Criado')
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
  const pedidoAnexos = Array.isArray(pedido.anexos) ? pedido.anexos : []

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Operação SHM
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Triagem & Gestão de Ciclos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              {pedido.assunto}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Manutenção de pedidos, gestão de ciclos, arquivos e orçamentação técnica
            </p>

            {/* Badges de Identificação & Metadados */}
            <div className="flex items-center gap-2 mt-3 flex-wrap text-xs font-bold">
              <span className="font-mono font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800/60">
                {pedido.protocolo}
              </span>
              {pedido.cliente_nome && (
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{pedido.cliente_nome}</span>
                </span>
              )}
              {pedido.contrato_numero && (
                <span className="inline-flex items-center gap-1.5 uppercase px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                  <span>{pedido.contrato_numero}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono font-semibold">(Saldo: {pedido.contrato_saldo}h)</span>
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-md font-black uppercase text-[10px] tracking-wider border ${
                pedido.prioridade === 'urgente' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/70' :
                pedido.prioridade === 'alta' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/70' :
                pedido.prioridade === 'media' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/70' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}>
                {pedido.prioridade_display}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                • Aberto por: <strong className="font-bold text-slate-700 dark:text-slate-300">{pedido.criado_por_nome || 'Usuário'}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                • {ciclos.length} ciclo(s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 mt-1 flex-wrap">
            <button
              onClick={() => {
                setAgendamentoContexto({
                  tipoSugerido: 'alinhamento',
                  tituloSugerido: `Alinhamento de Chamado - ${pedido.protocolo}`,
                })
                setModalAgendamentoOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-200 dark:border-indigo-800 shadow-2xs transition cursor-pointer"
              title="Agendar reunião com o cliente via Google Meet"
            >
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Agendar Reunião</span>
            </button>
            <Link
              to={`/pedidos/${pedido.id}`}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700 shadow-2xs transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Ver Pedido & Comentários</span>
            </Link>
            <button
              onClick={() => {
                setSelectedAnexosIds([])
                setShowNovoCiclo(true)
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Ciclo</span>
            </button>
          </div>
        </div>

        {/* Painel de Documentos do Pedido com Suporte a Drag-and-Drop */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
              <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Documentos Anexados ao Pedido ({pedidoAnexos.length})</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              💡 Arraste os arquivos para os ciclos abaixo para associá-los ao escopo técnico
            </span>
          </div>

          {pedidoAnexos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pedidoAnexos.map((anexo) => {
                const vinculos = ciclos.filter((c) =>
                  c.anexos_referenciados?.some((a) => a.id === anexo.id)
                )
                return (
                  <div
                    key={anexo.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('anexo_id', String(anexo.id))
                      e.dataTransfer.setData('text/plain', String(anexo.id))
                      e.dataTransfer.effectAllowed = 'copyMove'
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition cursor-grab active:cursor-grabbing select-none group"
                    title="Arraste para vincular a qualquer ciclo abaixo"
                  >
                    <div className="text-slate-400 group-hover:text-indigo-500 transition shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="shrink-0">{getIconeArquivo(anexo.nome_original)}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold text-slate-900 dark:text-white truncate"
                        title={anexo.nome_original}
                      >
                        {anexo.nome_original}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatarTamanho(anexo.tamanho)}
                        </span>
                        {vinculos.length > 0 ? (
                          <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                            Em {vinculos.length} {vinculos.length === 1 ? 'ciclo' : 'ciclos'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded-md">
                            Livre
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={anexo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Baixar documento"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              Nenhum documento anexado pelo cliente neste pedido.
            </div>
          )}
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

            {/* Seleção de Anexos para o novo ciclo */}
            {pedidoAnexos.length > 0 && (
              <div>
                <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Vincular Documentos do Pedido a este Novo Ciclo (Opcional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {pedidoAnexos.map((a) => {
                    const isSelected = selectedAnexosIds.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAnexosIds((prev) =>
                            prev.includes(a.id)
                              ? prev.filter((id) => id !== a.id)
                              : [...prev, a.id]
                          )
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                        />
                        {getIconeArquivo(a.nome_original)}
                        <span className="truncate flex-1" title={a.nome_original}>
                          {a.nome_original}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          ({formatarTamanho(a.tamanho)})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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
                      anexos_pedido_ids: selectedAnexosIds,
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
            <CicloItem
              key={c.id}
              c={c}
              apresentarOrcamentoMutation={apresentarOrcamentoMutation}
              navigate={navigate}
              todosAnexosPedido={pedidoAnexos}
            />
          ))}
        </div>
      </div>

      {/* Modal de Agendamento */}
      {pedido && (
        <ModalAgendamento
          isOpen={modalAgendamentoOpen}
          onClose={() => setModalAgendamentoOpen(false)}
          clienteId={pedido.cliente}
          clienteNome={pedido.cliente_nome}
          pedidoId={pedido.id}
          pedidoProtocolo={pedido.protocolo}
          pedidoAssunto={pedido.assunto}
          cicloId={agendamentoContexto.cicloId}
          cicloTipo={agendamentoContexto.cicloTipo}
          tipoSugerido={agendamentoContexto.tipoSugerido}
          tituloSugerido={agendamentoContexto.tituloSugerido}
          onAgendado={() => {
            queryClient.invalidateQueries({ queryKey: ['pedido', id] })
            toast.success('Reunião agendada e sincronizada com o Google Calendar / Meet!', 'Agendado')
          }}
        />
      )}
    </AppLayout>
  )
}