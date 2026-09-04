import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  Layers,
  ThumbsUp,
  CornerDownRight,
  Star,
  Play,
  Paperclip,
  Download,
  Music,
  Image as ImageIcon,
  Archive,
  FileText,
} from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { type Ciclo, type Pedido, type Comentario, getUserRoleBadgeInfo } from '../../types'
import { ScrollToTopButton } from '../ui/ScrollToTopButton'

// ─── Helpers ───────────────────────────────────────────────────────────────

const MAX_ARQUIVOS_COMENTARIO = 3
const MAX_ARQUIVO_BYTES = 25 * 1024 * 1024 // 25 MB

const EXTENSOES_PERMITIDAS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'odt', 'ods', 'rtf',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
  'mp3', 'wav', 'ogg', 'm4a',
  'zip', 'rar', '7z', 'tar', 'gz',
])

const EXTENSOES_PROIBIDAS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'com', 'scr', 'vbs', 'js', 'msi', 'jar', 'apk',
])

function validarArquivo(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (EXTENSOES_PROIBIDAS.has(ext)) {
    return `O arquivo "${file.name}" possui formato executável proibido.`
  }
  if (!EXTENSOES_PERMITIDAS.has(ext)) {
    return `O arquivo "${file.name}" possui extensão (.${ext}) não permitida.`
  }
  if (file.size > MAX_ARQUIVO_BYTES) {
    return `O arquivo "${file.name}" excede o limite máximo de 25 MB.`
  }
  return null
}

function formatarTamanho(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAudioFile(nome: string): boolean {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)
}

function isImageFile(nome: string): boolean {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)
}

function getCommentFileIcon(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (isAudioFile(nome)) {
    return <Music className="w-3.5 h-3.5 text-violet-500 shrink-0" />
  }
  if (isImageFile(nome)) {
    return <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
  }
  return <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
}

function getCicloStatusDot(status: string) {
  switch (status) {
    case 'aceito':
      return 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900'
    case 'em_execucao':
      return 'bg-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-900 animate-pulse'
    case 'aguardando_aceite':
      return 'bg-purple-500 ring-2 ring-purple-300 dark:ring-purple-900'
    case 'aguardando_aprovacao':
      return 'bg-sky-500 ring-2 ring-sky-300 dark:ring-sky-900'
    case 'orcado':
      return 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900'
    case 'aprovado':
      return 'bg-teal-500 ring-2 ring-teal-300 dark:ring-teal-900'
    case 'cancelado':
      return 'bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-900'
    default:
      return 'bg-slate-400 ring-2 ring-slate-300 dark:ring-slate-700'
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Star Rating Widget ─────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (n: number) => void; size?: 'sm' | 'md' }) {
  const [hovered, setHovered] = useState(0)
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 cursor-pointer"
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`${sz} transition-colors ${
              n <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-slate-300 dark:text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Avatar helper ─────────────────────────────────────────────────────────

function CommentAvatar({ avatarUrl, nome }: { avatarUrl?: string | null; nome?: string | null }) {
  if (avatarUrl) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <img src={avatarUrl} alt={nome || 'Avatar'} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-[10px] flex items-center justify-center shrink-0">
      {nome ? nome[0].toUpperCase() : <UserIcon className="w-3 h-3" />}
    </div>
  )
}

// ─── Modal de Avaliação ────────────────────────────────────────────────────

interface AvaliacaoModalProps {
  cicloId: number
  cicloTipo: string
  pedidoProtocolo: string
  onClose: () => void
  onSkip: () => void
}

function AvaliacaoModal({ cicloId, cicloTipo, pedidoProtocolo, onClose, onSkip }: AvaliacaoModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')

  const avaliarMutation = useMutation({
    mutationFn: () => clientService.ciclos.avaliar(cicloId, { nota, comentario }),
    onSuccess: () => {
      toast.success(`Avaliação de ${nota}⭐ registrada com sucesso!`, 'Obrigado pelo feedback!')
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      onClose()
    },
    onError: () => toast.error('Erro ao registrar avaliação.', 'Falha'),
  })

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto text-2xl">
            ⭐
          </div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg">Como foi esse atendimento?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ciclo aceito: <strong className="text-slate-700 dark:text-slate-300">{cicloTipo}</strong> — Pedido{' '}
            <strong className="text-slate-700 dark:text-slate-300">{pedidoProtocolo}</strong>
          </p>
        </div>

        {/* Stars */}
        <div className="flex flex-col items-center gap-2">
          <StarRating value={nota} onChange={setNota} />
          {nota > 0 && (
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {['', 'Muito insatisfeito 😞', 'Insatisfeito 😕', 'Regular 😐', 'Satisfeito 😊', 'Muito satisfeito 😄'][nota]}
            </p>
          )}
        </div>

        {/* Comentário opcional */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Comentário <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte mais sobre sua experiência com este atendimento..."
            maxLength={2000}
            className="w-full text-xs p-3.5 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100 resize-none"
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2.5 pt-1">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition"
          >
            Pular por enquanto
          </button>
          <button
            disabled={nota === 0 || avaliarMutation.isPending}
            onClick={() => avaliarMutation.mutate()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer transition"
          >
            {avaliarMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Avaliar {nota > 0 ? `(${nota}⭐)` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Comment Item ──────────────────────────────────────────────────────────

interface CommentItemProps {
  c: Comentario
  user: any
  cicloAtual: Ciclo
  isReply?: boolean
  onRefresh: () => void
}

function CommentItem({ c, user, cicloAtual, isReply = false, onRefresh }: CommentItemProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [deletingConfirm, setDeletingConfirm] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyArquivos, setReplyArquivos] = useState<File[]>([])
  const replyFileInputRef = useRef<HTMLInputElement>(null)

  const isOwner = Boolean(
    user &&
    (c.autor === user.id ||
      (c.autor_username && c.autor_username === user.username) ||
      (c.autor_nome && user.first_name && c.autor_nome.toLowerCase().includes(user.first_name.toLowerCase())))
  )
  const isUpdated = Boolean(c.atualizado_em && c.criado_em && c.atualizado_em !== c.criado_em)

  const editarMutation = useMutation({
    mutationFn: () => clientService.comunicacao.update(c.id, { texto: editText.trim() }),
    onSuccess: () => { setIsEditing(false); setEditText(''); onRefresh() },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Erro ao editar comentário.', 'Falha'),
  })

  const removerAnexoMutation = useMutation({
    mutationFn: (anexoId: string) => clientService.comunicacao.removerAnexo(c.id, anexoId),
    onSuccess: () => {
      onRefresh()
      toast.success('Anexo removido do comentário!', 'Anexo Excluído')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Erro ao remover anexo.', 'Falha'),
  })

  const excluirMutation = useMutation({
    mutationFn: () => clientService.comunicacao.delete(c.id),
    onSuccess: () => { setDeletingConfirm(false); onRefresh() },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Erro ao excluir comentário.', 'Falha'),
  })

  const reagirMutation = useMutation({
    mutationFn: () => clientService.comunicacao.reagir(c.id, 'like'),
    onSuccess: onRefresh,
    onError: () => toast.error('Erro ao registrar reação.', 'Falha'),
  })

  const responderMutation = useMutation({
    mutationFn: () => {
      const textoFinal = replyText.trim() || (replyArquivos.length > 0 ? 'Arquivo(s) anexado(s)' : '')
      if (replyArquivos.length > 0) {
        const formData = new FormData()
        formData.append('ciclo', String(cicloAtual.id))
        formData.append('texto', textoFinal)
        formData.append('parent', c.id)
        for (const f of replyArquivos) {
          formData.append('arquivos', f)
          formData.append('anexos', f)
        }
        return clientService.comunicacao.create(formData)
      }
      return clientService.comunicacao.create({
        ciclo: cicloAtual.id,
        texto: textoFinal,
        parent: c.id,
      })
    },
    onSuccess: (newReply: any) => {
      setReplyText('')
      setReplyArquivos([])
      setReplyOpen(false)
      if (newReply && cicloAtual) {
        queryClient.setQueryData(['comentarios', cicloAtual.id], (old: any) => {
          if (!Array.isArray(old)) return old
          return old.map((parent: any) => {
            if (parent.id === c.id) {
              const respostas = Array.isArray(parent.respostas) ? parent.respostas : []
              if (!respostas.some((r: any) => r.id === newReply.id)) {
                return { ...parent, respostas: [...respostas, newReply] }
              }
            }
            return parent
          })
        })
      }
      onRefresh()
      toast.success('Resposta publicada!', 'Resposta')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Erro ao publicar resposta.', 'Falha'),
  })

  const handleReplyFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    if (replyArquivos.length + selected.length > MAX_ARQUIVOS_COMENTARIO) {
      toast.error(`Você pode anexar no máximo ${MAX_ARQUIVOS_COMENTARIO} arquivos por resposta.`, 'Limite Excedido')
      e.target.value = ''
      return
    }
    for (const f of selected) {
      const err = validarArquivo(f)
      if (err) {
        toast.error(err, 'Arquivo Inválido')
        e.target.value = ''
        return
      }
    }
    setReplyArquivos((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const indentClass = isReply ? 'ml-6 border-l-2 border-indigo-200 dark:border-indigo-800/50 pl-4' : ''

  return (
    <div className={`space-y-2 ${indentClass}`}>
      {/* Confirm delete modal */}
      {deletingConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-base">
              <Trash2 className="w-5 h-5" />
              <span>Excluir Comentário</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Tem certeza que deseja apagar este comentário? Todos os arquivos anexados a ele também serão excluídos permanentemente.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => setDeletingConfirm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button
                disabled={excluirMutation.isPending}
                onClick={() => excluirMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 disabled:cursor-wait shadow-sm cursor-pointer"
              >
                {excluirMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Excluindo...</span></> : <span>Confirmar Exclusão</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment card */}
      <div className={`p-4 rounded-2xl border text-xs transition duration-150 space-y-2.5 ${
        isOwner
          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CommentAvatar avatarUrl={c.autor_avatar_url} nome={c.autor_nome} />
            <span className="font-black text-slate-900 dark:text-white">{c.autor_nome}</span>
            {(() => {
              const info = getUserRoleBadgeInfo(c.autor_role)
              return (
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border tracking-wider uppercase ${
                      info.org === 'Empresa'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50'
                        : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50'
                    }`}
                  >
                    {info.org}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border tracking-wider uppercase ${
                      info.roleType === 'Gerente'
                        ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800/60'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {info.roleType}
                  </span>
                </div>
              )
            })()}
            {isOwner && (
              <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Você</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-semibold">
              <span>{formatDate(c.criado_em)}</span>
              {isUpdated && <span className="text-slate-500 italic font-sans">(editado)</span>}
            </div>
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setIsEditing(true); setEditText(c.texto) }}
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-slate-750 rounded-lg transition cursor-pointer"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingConfirm(true)}
                  className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content / Edit mode */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-xs p-3 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100"
            />
            {/* Anexos durante edição (com remoção individual) */}
            {c.anexos && c.anexos.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Anexos da mensagem (clique para apagar):
                </span>
                <div className="flex flex-wrap gap-2">
                  {c.anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200 text-xs"
                    >
                      {getCommentFileIcon(anexo.nome_original)}
                      <span className="truncate max-w-[130px] font-semibold" title={anexo.nome_original}>
                        {anexo.nome_original}
                      </span>
                      <button
                        type="button"
                        disabled={removerAnexoMutation.isPending}
                        onClick={() => removerAnexoMutation.mutate(anexo.id)}
                        className="p-0.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 rounded transition cursor-pointer"
                        title="Apagar este arquivo da mensagem"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsEditing(false); setEditText('') }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer">
                <X className="w-3 h-3" /><span>Cancelar</span>
              </button>
              <button
                disabled={!editText.trim() || editarMutation.isPending}
                onClick={() => editText.trim() && editarMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-wait cursor-pointer"
              >
                {editarMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /><span>Salvando...</span></> : <><Check className="w-3 h-3" /><span>Salvar</span></>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">{c.texto}</p>

            {/* Anexos em modo visualização */}
            {c.anexos && c.anexos.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {c.anexos.map((anexo) => {
                    const isAudio = isAudioFile(anexo.nome_original)
                    const isImg = isImageFile(anexo.nome_original)
                    return (
                      <div
                        key={anexo.id}
                        className="flex flex-col gap-1 p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          {getCommentFileIcon(anexo.nome_original)}
                          <span
                            className="font-bold text-xs truncate max-w-[140px] sm:max-w-[200px] text-slate-900 dark:text-slate-100"
                            title={anexo.nome_original}
                          >
                            {anexo.nome_original}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({formatarTamanho(anexo.tamanho)})
                          </span>
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 rounded transition ml-auto"
                            title="Baixar anexo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {isAudio && (
                          <audio
                            controls
                            src={anexo.url}
                            preload="metadata"
                            className="w-full max-w-[260px] h-7 mt-0.5"
                          />
                        )}
                        {isImg && (
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[180px] max-h-28 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 hover:opacity-90 transition mt-0.5"
                          >
                            <img
                              src={anexo.url}
                              alt={anexo.nome_original}
                              className="object-cover w-full h-full"
                              loading="lazy"
                            />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions: Like + Reply */}
        {!isEditing && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => reagirMutation.mutate()}
              disabled={reagirMutation.isPending}
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer disabled:opacity-60 ${
                c.user_reacted
                  ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 hover:border-indigo-300'
              }`}
              title={c.user_reacted ? 'Remover like' : 'Curtir este comentário'}
            >
              <ThumbsUp className={`w-3 h-3 ${c.user_reacted ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
              <span>{(c.reacoes_count ?? 0) > 0 ? c.reacoes_count : 'Curtir'}</span>
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyOpen(!replyOpen)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Responder</span>
                {(c.respostas?.length ?? 0) > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {c.respostas!.length}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply input (inline com anexos) */}
      {replyOpen && !isReply && (
        <div className="ml-6 space-y-2">
          <div className="flex gap-2 items-start">
            <CornerDownRight className="w-4 h-4 text-slate-400 mt-2.5 shrink-0" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && (replyText.trim() || replyArquivos.length > 0)) {
                    e.preventDefault()
                    responderMutation.mutate()
                  }
                }}
                disabled={responderMutation.isPending}
                placeholder={`Responder a ${c.autor_nome}...`}
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-60"
              />

              <input
                ref={replyFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleReplyFiles}
              />
              <button
                type="button"
                disabled={responderMutation.isPending || replyArquivos.length >= MAX_ARQUIVOS_COMENTARIO}
                onClick={() => replyFileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 transition cursor-pointer disabled:opacity-40 shrink-0"
                title={`Anexar arquivo (até ${MAX_ARQUIVOS_COMENTARIO}, máx 25 MB cada)`}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                disabled={(!replyText.trim() && replyArquivos.length === 0) || responderMutation.isPending}
                onClick={() => responderMutation.mutate()}
                className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-wait transition cursor-pointer shadow-sm shrink-0"
                title="Publicar resposta"
              >
                {responderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Prévia de anexos na resposta */}
          {replyArquivos.length > 0 && (
            <div className="ml-6 flex flex-wrap gap-2">
              {replyArquivos.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 text-xs font-semibold"
                >
                  {getCommentFileIcon(file.name)}
                  <span className="truncate max-w-[120px]" title={file.name}>{file.name}</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                    ({formatarTamanho(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyArquivos((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-0.5 text-indigo-400 hover:text-rose-500 rounded transition cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Replies */}
      {!isReply && (c.respostas?.length ?? 0) > 0 && (
        <div className="space-y-2 pt-0.5">
          {[...c.respostas!]
            .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
            .map((r) => (
              <CommentItem key={r.id} c={r} user={user} cicloAtual={cicloAtual} isReply onRefresh={onRefresh} />
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface CicloCarouselProps {
  pedido: Pedido
  ciclos: Ciclo[]
}

export function CicloCarousel({ pedido, ciclos }: CicloCarouselProps) {
  const { user, isEmpresa, canApprove } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initialIndex = () => {
    const focusId = searchParams.get('ciclo')
    if (focusId) {
      const idx = ciclos.findIndex(c => String(c.id) === focusId)
      return idx >= 0 ? idx : 0
    }
    return 0
  }
  
  const [index, setIndex] = useState(initialIndex)

  // Opcional: Se a URL mudar, atualiza o index
  useEffect(() => {
    const focusId = searchParams.get('ciclo')
    if (focusId) {
      const idx = ciclos.findIndex(c => String(c.id) === focusId)
      if (idx >= 0) setIndex(idx)
    }
  }, [searchParams, ciclos])


  const [modalType, setModalType] = useState<'rejeitar' | 'recusar' | 'aceitar_excecao' | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [comentarioTexto, setComentarioTexto] = useState('')
  const [comentarioArquivos, setComentarioArquivos] = useState<File[]>([])
  const mainFileInputRef = useRef<HTMLInputElement>(null)

  const handleMainFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    if (comentarioArquivos.length + selected.length > MAX_ARQUIVOS_COMENTARIO) {
      toast.error(
        `Você pode anexar no máximo ${MAX_ARQUIVOS_COMENTARIO} arquivos por comentário.`,
        'Limite Excedido'
      )
      e.target.value = ''
      return
    }
    for (const f of selected) {
      const err = validarArquivo(f)
      if (err) {
        toast.error(err, 'Arquivo Inválido')
        e.target.value = ''
        return
      }
    }
    setComentarioArquivos((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  // Avaliação modal (aparece automaticamente após aceite bem-sucedido)
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false)
  const [avaliacaoSkippedCiclos, setAvaliacaoSkippedCiclos] = useState<Set<number>>(new Set())

  const cicloAtual = ciclos[index] || null

  const { data: rawComentarios } = useQuery({
    queryKey: ['comentarios', cicloAtual?.id],
    queryFn: () => (cicloAtual ? clientService.comunicacao.list(cicloAtual.id) : Promise.resolve([])),
    enabled: Boolean(cicloAtual),
    refetchInterval: 4000,
  })

  // Garante que a lista de mensagens raiz esteja sempre ordenada por criado_em crescente (a mais recente sempre como a última)
  const rawComentariosList = Array.isArray(rawComentarios) ? rawComentarios : []
  const comentarios = useMemo(() => {
    return [...rawComentariosList].sort(
      (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    )
  }, [rawComentariosList])

  const totalMensagens = comentarios.reduce((acc, c) => acc + 1 + (c.respostas?.length || 0), 0)
  const totalLikes = comentarios.reduce((acc, c) => {
    const mainLikes = c.reacoes_count || 0
    const replyLikes = (c.respostas || []).reduce((rAcc, r) => rAcc + (r.reacoes_count || 0), 0)
    return acc + mainLikes + replyLikes
  }, 0)

  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const prevTotalMensagensRef = useRef<number>(0)
  const prevCicloIdRef = useRef<number | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const performScroll = () => {
      if (commentsContainerRef.current) {
        commentsContainerRef.current.scrollTo({
          top: commentsContainerRef.current.scrollHeight,
          behavior,
        })
      }
    }
    requestAnimationFrame(performScroll)
    setTimeout(performScroll, 50)
    setTimeout(performScroll, 200)
  }, [])

  useEffect(() => {
    const isNewCiclo = cicloAtual?.id !== prevCicloIdRef.current
    const hasNewMessages = totalMensagens > prevTotalMensagensRef.current

    if (totalMensagens > 0 && (isNewCiclo || hasNewMessages)) {
      scrollToBottom(hasNewMessages && !isNewCiclo ? 'smooth' : 'auto')
    }

    prevTotalMensagensRef.current = totalMensagens
    prevCicloIdRef.current = cicloAtual?.id || null
  }, [totalMensagens, cicloAtual?.id, scrollToBottom])

  const horasEstimadasNum = Number(cicloAtual?.horas_estimadas) || 0
  const horasRealizadasNum = Number(cicloAtual?.horas_realizadas) || 0
  const limiteTolerancia = horasEstimadasNum * 1.3
  const excedeTolerancia = horasEstimadasNum > 0 && horasRealizadasNum > limiteTolerancia

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] })
    queryClient.invalidateQueries({ queryKey: ['comentarios', cicloAtual?.id] })
    queryClient.invalidateQueries({ queryKey: ['contratos'] })
    queryClient.invalidateQueries({ queryKey: ['kanban'] })
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  const apresentarOrcamentoMutation = useMutation({
    mutationFn: ({ id, horas }: { id: number; horas: number }) =>
      clientService.ciclos.apresentarOrcamento(id, horas),
    onSuccess: () => {
      refreshData()
      toast.success('Orçamento emitido para aprovação do cliente!', 'Orçamento Emitido')
    },
    onError: () => toast.error('Erro ao emitir orçamento.', 'Falha'),
  })

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

  const aceitarMutation = useMutation({
    mutationFn: ({ id, justificativa_excedente }: { id: number; justificativa_excedente?: string }) =>
      clientService.ciclos.aceitar(id, justificativa_excedente),
    onSuccess: () => {
      setModalType(null)
      setJustificativa('')
      refreshData()
      toast.success(`Aceite final concedido (${Number(cicloAtual?.horas_realizadas).toFixed(1)}h debitadas do saldo)!`, 'Aceite Concluído')
      // Abre modal de avaliação automaticamente após aceite (se não foi pulado)
      if (cicloAtual && !avaliacaoSkippedCiclos.has(cicloAtual.id)) {
        setShowAvaliacaoModal(true)
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao conceder aceite.'
      toast.error(msg, 'Falha')
    },
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
    mutationFn: ({
      cicloId,
      texto,
      arquivos,
    }: {
      cicloId: number
      texto: string
      arquivos?: File[]
    }) => {
      if (arquivos && arquivos.length > 0) {
        const textoFinal = texto.trim() || 'Arquivo(s) anexado(s)'
        const formData = new FormData()
        formData.append('ciclo', String(cicloId))
        formData.append('texto', textoFinal)
        for (const f of arquivos) {
          formData.append('arquivos', f)
          formData.append('anexos', f)
        }
        return clientService.comunicacao.create(formData)
      }
      return clientService.comunicacao.create({ ciclo: cicloId, texto: texto.trim() })
    },
    onSuccess: (newComentario: any) => {
      setComentarioTexto('')
      setComentarioArquivos([])
      if (newComentario && cicloAtual) {
        queryClient.setQueryData(['comentarios', cicloAtual.id], (old: any) => {
          const list = Array.isArray(old) ? old : []
          if (!list.some((item: any) => item.id === newComentario.id)) {
            return [...list, newComentario]
          }
          return list
        })
      }
      refreshData()
      scrollToBottom('smooth')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Erro ao enviar comentário.', 'Falha'),
  })

  const reenviarMagicLinkMutation = useMutation({
    mutationFn: (id: number) => clientService.ciclos.reenviarMagicLink(id),
    onSuccess: (data) => {
      refreshData()
      toast.success(data.detail || 'Magic Link reenviado com sucesso por e-mail!', 'Link Reenviado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao reenviar Magic Link.'
      toast.error(msg, 'Falha no Reenvio')
    },
  })

  // ── Early return: no ciclo ─────────────────────────────────────────────

  if (!cicloAtual) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
          <Layers className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
            Nenhum ciclo cadastrado ainda
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            Este pedido ainda não possui ciclos técnicos. Nossa equipe irá orçar e criar o primeiro ciclo em breve.
          </p>
        </div>
      </div>
    )
  }

  const tarefas = Array.isArray(cicloAtual.tarefas) ? cicloAtual.tarefas : []

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Avaliação Modal ── */}
      {showAvaliacaoModal && canApprove && cicloAtual && (
        <AvaliacaoModal
          cicloId={cicloAtual.id}
          cicloTipo={cicloAtual.tipo_display}
          pedidoProtocolo={pedido.protocolo}
          onClose={() => setShowAvaliacaoModal(false)}
          onSkip={() => {
            setAvaliacaoSkippedCiclos((s) => new Set(s).add(cicloAtual.id))
            setShowAvaliacaoModal(false)
          }}
        />
      )}

      {/* ── Navigation Header & Cycle Switcher ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/20 dark:from-indigo-500/20 dark:to-violet-500/30 border border-indigo-200/70 dark:border-indigo-700/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs shadow-indigo-500/20">
                  {ciclos.length === 1 ? 'Ciclo Único' : `Ciclo ${index + 1} de ${ciclos.length}`}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${getCicloStatusDot(cicloAtual.status)}`} />
                  <span>{cicloAtual.status_display}</span>
                </span>
                {/* Contador de comentários e likes na mesma etiqueta */}
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="inline-flex items-center gap-1" title={`${totalMensagens} comentário(s)`}>
                    <MessageSquare className="w-3 h-3 text-indigo-500" />
                    <span>{totalMensagens}</span>
                  </span>
                  <span className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
                  <span className="inline-flex items-center gap-1" title={`${totalLikes} curtida(s)`}>
                    <ThumbsUp className="w-3 h-3 text-indigo-500" />
                    <span>{totalLikes}</span>
                  </span>
                </span>
                {/* Badge de avaliação se aceito */}
                {cicloAtual.status === 'aceito' && cicloAtual.avaliacao && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {cicloAtual.avaliacao.nota}/5
                  </span>
                )}
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight mt-0.5">
                {cicloAtual.tipo_display}
              </h3>
            </div>
          </div>

          {/* Previous / Next Controls */}
          {ciclos.length > 1 ? (
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
              <button
                disabled={index === 0}
                onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
                className="group flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs active:scale-95"
                title="Ciclo Anterior"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Anterior</span>
              </button>

              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {index + 1} / {ciclos.length}
              </div>

              <button
                disabled={index === ciclos.length - 1}
                onClick={() => setIndex((prev) => Math.min(prev + 1, ciclos.length - 1))}
                className="group flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none transition cursor-pointer active:scale-95"
                title="Próximo Ciclo"
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                1 de 1 Ciclo Disponível
              </span>
            </div>
          )}
        </div>

        {/* Interactive Cycle Tabs */}
        {ciclos.length > 1 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Navegar Entre Ciclos:</span>
              <span className="text-slate-600 dark:text-slate-400 font-semibold lowercase">clique para alternar</span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {ciclos.map((c, i) => {
                const isActive = i === index
                return (
                  <button
                    key={c.id}
                    onClick={() => setIndex(i)}
                    className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/50 font-black scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 hover:scale-[1.01]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                      {i + 1}
                    </span>
                    <span>{c.tipo_display}</span>
                    <span className={`w-2 h-2 rounded-full ${getCicloStatusDot(c.status)}`} />
                    <span className={`text-[11px] font-semibold ${isActive ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      {Number(c.horas_estimadas).toFixed(1)}h
                    </span>
                    {c.avaliacao && (
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Ciclo Detail Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5 flex-1">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">Escopo Técnico do Ciclo</div>
            <p className="text-slate-900 dark:text-slate-100 font-medium text-sm leading-relaxed">{cicloAtual.contexto || 'Sem contexto detalhado.'}</p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 self-start lg:self-auto">
            <div className="text-center flex flex-col items-center justify-center min-w-[70px]">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">Estimadas</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{Number(cicloAtual.horas_estimadas).toFixed(1)}h</div>
            </div>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 shrink-0" />
            <div className="text-center flex flex-col items-center justify-center min-w-[70px]">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">Realizadas</div>
              <div className={`text-lg font-black ${
                excedeTolerancia
                  ? 'text-rose-600 dark:text-rose-400'
                  : horasEstimadasNum > 0 && horasRealizadasNum > horasEstimadasNum
                  ? 'text-amber-600 dark:text-amber-400'
                  : horasEstimadasNum > 0 && horasRealizadasNum < horasEstimadasNum && horasRealizadasNum > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-indigo-700 dark:text-indigo-400'
              }`}>
                {horasRealizadasNum.toFixed(1)}h
              </div>
              {excedeTolerancia && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 mt-0.5 border border-rose-200 dark:border-rose-800/60" title={`Excede a tolerância de +30% (${limiteTolerancia.toFixed(1)}h). Exige justificativa de aprovação no aceite.`}>
                  &gt;+30% Exceção
                </span>
              )}
              {!excedeTolerancia && horasEstimadasNum > 0 && horasRealizadasNum > horasEstimadasNum && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 mt-0.5" title="Dentro da margem de 30% de tolerância">
                  +{(((horasRealizadasNum - horasEstimadasNum) / horasEstimadasNum) * 100).toFixed(0)}%
                </span>
              )}
              {horasEstimadasNum > 0 && horasRealizadasNum < horasEstimadasNum && horasRealizadasNum > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 mt-0.5 border border-emerald-200/60 dark:border-emerald-800/40" title={`Economia de ${(((horasEstimadasNum - horasRealizadasNum) / horasEstimadasNum) * 100).toFixed(0)}% sobre o orçamento aprovado`}>
                  -{(((horasEstimadasNum - horasRealizadasNum) / horasEstimadasNum) * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 shrink-0" />
            <div className="text-center flex flex-col items-center justify-center min-w-[70px]">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">Status</div>
              <span className="inline-flex items-center justify-center mt-0.5 text-[11px] font-black px-3 py-0.5 rounded-full uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
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
                <div className="flex items-center gap-2 text-xs font-bold shrink-0 self-end sm:self-auto">
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

        {/* Documentos Vinculados ao Ciclo */}
        {cicloAtual.anexos_referenciados && cicloAtual.anexos_referenciados.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2 mb-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              <span>Documentos Vinculados a este Ciclo ({cicloAtual.anexos_referenciados.length})</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {cicloAtual.anexos_referenciados.map((anexo) => (
                <div
                  key={anexo.id}
                  className="inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                >
                  {getCommentFileIcon(anexo.nome_original)}
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={anexo.nome_original}>
                    {anexo.nome_original}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({formatarTamanho(anexo.tamanho)})
                  </span>
                  <a
                    href={anexo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition ml-1"
                    title="Baixar documento"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating badge on accepted cycle */}
        {cicloAtual.status === 'aceito' && (
          <div className={`rounded-2xl p-4 border mt-6 ${
            cicloAtual.avaliacao
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
              : 'bg-slate-50 dark:bg-slate-800/60 border-dashed border-slate-200 dark:border-slate-700'
          }`}>
            {cicloAtual.avaliacao ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Avaliação do Cliente</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= cicloAtual.avaliacao!.nota ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 dark:text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 text-sm">{cicloAtual.avaliacao.nota}/5</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      por {cicloAtual.avaliacao.avaliador_nome} {cicloAtual.avaliacao.avaliador_empresa ? `(${cicloAtual.avaliacao.avaliador_empresa})` : ''}
                    </span>
                  </div>
                  {cicloAtual.avaliacao.comentario && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 italic">"{cicloAtual.avaliacao.comentario}"</p>
                  )}
                </div>
              </div>
            ) : user?.role === 'CLIENTE_GERENTE' ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-0.5">Avaliação Pendente</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Como foi este atendimento? Sua avaliação nos ajuda a melhorar.</p>
                </div>
                <button
                  onClick={() => setShowAvaliacaoModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800/60 transition cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  Avaliar Atendimento
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">Aguardando avaliação do cliente.</p>
            )}
          </div>
        )}

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
            {canApprove && ['aguardando_aprovacao', 'orcado'].includes(cicloAtual.status) && (
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
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Aprovando Orçamento...</span></>
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
                  onClick={() => {
                    if (excedeTolerancia) {
                      setModalType('aceitar_excecao')
                    } else {
                      aceitarMutation.mutate({ id: cicloAtual.id })
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                >
                  {aceitarMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Concedendo Aceite Final...</span></>
                  ) : (
                    <span>Conceder Aceite Final ({horasRealizadasNum.toFixed(1)}h)</span>
                  )}
                </button>
              </>
            )}

            {/* Ações Técnico */}
            {isEmpresa && (cicloAtual.status === 'aguardando_aprovacao' || cicloAtual.status === 'aguardando_aceite') && (
              <button
                disabled={reenviarMagicLinkMutation.isPending}
                onClick={() => reenviarMagicLinkMutation.mutate(cicloAtual.id)}
                className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait shadow-2xs"
                title={`Renovar token seguro e redisparar e-mail de ${cicloAtual.status === 'aguardando_aprovacao' ? 'aprovação de orçamento' : 'aceite final'}`}
              >
                {reenviarMagicLinkMutation.isPending && (reenviarMagicLinkMutation.variables as any) === cicloAtual.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reenviando Magic Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Reenviar Magic Link</span>
                  </>
                )}
              </button>
            )}

            {isEmpresa && cicloAtual.status === 'orcado' && (
              <button
                disabled={apresentarOrcamentoMutation.isPending}
                onClick={() => apresentarOrcamentoMutation.mutate({ id: cicloAtual.id, horas: Number(cicloAtual.horas_estimadas) })}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {apresentarOrcamentoMutation.isPending && (apresentarOrcamentoMutation.variables as any)?.id === cicloAtual.id ? (
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

            {isEmpresa && (cicloAtual.status === 'aprovado' || cicloAtual.status === 'em_execucao') && (
              <button
                onClick={() => navigate(`/admin/ciclos/${cicloAtual.id}/execucao`)}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Ir para Execução</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Justificativa (Rejeição / Recusa / Aceite de Exceção) ── */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            {modalType === 'aceitar_excecao' ? (
              <>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-base">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Aceite de Exceção por Excesso de Horas</span>
                </div>
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
                  <p className="font-bold">
                    As horas realizadas ({horasRealizadasNum.toFixed(1)}h) excedem o orçamento aprovado ({horasEstimadasNum.toFixed(1)}h) com margem de tolerância de 30% ({limiteTolerancia.toFixed(1)}h).
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Para autorizar formalmente o débito integral de <strong>{horasRealizadasNum.toFixed(1)}h</strong> do saldo contratual, informe a justificativa de aprovação desta exceção (será registrada na trilha de auditoria forense do contrato):
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Informe o motivo da aprovação do excedente de horas (ex: complexidade adicional alinhada com a equipe técnica)..."
                  className="w-full text-xs p-3.5 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100"
                />
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    disabled={aceitarMutation.isPending}
                    onClick={() => { setModalType(null); setJustificativa('') }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!justificativa.trim() || aceitarMutation.isPending}
                    onClick={() => {
                      aceitarMutation.mutate({ id: cicloAtual.id, justificativa_excedente: justificativa })
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 disabled:cursor-wait shadow-sm cursor-pointer"
                  >
                    {aceitarMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Autorizando Débito...</span></>
                    ) : (
                      <span>Autorizar Débito & Aceitar</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
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
                    onClick={() => { setModalType(null); setJustificativa('') }}
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
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Rejeitando Orçamento...</span></>
                    ) : recusarMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Recusando Aceite...</span></>
                    ) : (
                      <span>Confirmar Recusa</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Comentários Thread ── */}
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
              {totalMensagens} {totalMensagens === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </div>
        </div>

        {/* Container Relativo com Botão Flutuante e Lista de Comentários */}
        <div className="relative">
          <ScrollToTopButton
            targetRef={commentsContainerRef}
            title="Rolar para o início das mensagens"
            className="absolute top-2.5 left-1/2 -translate-x-1/2"
          />

          {/* Lista de Comentários */}
          <div
            ref={commentsContainerRef}
            className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1 scroll-smooth"
          >
            {comentarios.map((c) => (
              <CommentItem
                key={c.id}
                c={c}
                user={user}
                cicloAtual={cicloAtual}
                onRefresh={refreshData}
              />
            ))}
            <div ref={commentsEndRef} />

            {totalMensagens === 0 && (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                <p>Nenhuma mensagem registrada neste ciclo. Todos os usuários da empresa e do cliente podem comentar abaixo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Formulário de Novo Comentário com Anexo */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if ((comentarioTexto.trim() || comentarioArquivos.length > 0) && cicloAtual) {
              comentarioMutation.mutate({
                cicloId: cicloAtual.id,
                texto: comentarioTexto.trim(),
                arquivos: comentarioArquivos,
              })
            }
          }}
          className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <div className="flex gap-2.5">
            <input
              type="text"
              disabled={comentarioMutation.isPending}
              value={comentarioTexto}
              onChange={(e) => setComentarioTexto(e.target.value)}
              placeholder={
                comentarioMutation.isPending
                  ? 'Enviando comentário...'
                  : 'Escreva uma mensagem ou observação sobre este ciclo (visível para todos)...'
              }
              className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-60"
            />

            <input
              ref={mainFileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleMainFiles}
            />

            <button
              type="button"
              disabled={comentarioMutation.isPending || comentarioArquivos.length >= MAX_ARQUIVOS_COMENTARIO}
              onClick={() => mainFileInputRef.current?.click()}
              className="inline-flex items-center justify-center p-3 rounded-2xl border border-slate-300/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 shrink-0"
              title={`Anexar arquivo (até ${MAX_ARQUIVOS_COMENTARIO} arquivos, máx 25 MB cada)`}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={
                (!comentarioTexto.trim() && comentarioArquivos.length === 0) ||
                comentarioMutation.isPending
              }
              className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-3 rounded-2xl disabled:opacity-50 disabled:cursor-wait transition cursor-pointer shadow-sm shadow-indigo-500/20 shrink-0"
              title={comentarioMutation.isPending ? 'Enviando comentário...' : 'Publicar Comentário'}
            >
              {comentarioMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Chips de arquivos selecionados no novo comentário */}
          {comentarioArquivos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Anexos:
              </span>
              {comentarioArquivos.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 text-xs font-semibold"
                >
                  {getCommentFileIcon(file.name)}
                  <span className="truncate max-w-[140px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                    ({formatarTamanho(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setComentarioArquivos((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-0.5 text-indigo-400 hover:text-rose-500 rounded transition cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}