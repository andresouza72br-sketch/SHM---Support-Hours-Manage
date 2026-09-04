import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, UploadCloud, FileText, Image as ImageIcon, Music, Archive, Trash2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import type { PrioridadePedido } from '../types'

const MAX_ARQUIVOS_PEDIDO = 10
const MAX_TAMANHO_BYTES = 25 * 1024 * 1024 // 25 MB

const EXTENSOES_PERMITIDAS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'odt', 'ods', 'rtf',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
  'mp3', 'wav', 'ogg', 'm4a',
  'zip', 'rar', '7z', 'tar', 'gz',
])

const EXTENSOES_PROIBIDAS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'com', 'scr', 'vbs', 'js', 'msi', 'jar', 'apk',
])

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Music className="w-4 h-4 text-violet-500 shrink-0" />
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-4 h-4 text-amber-500 shrink-0" />
  }
  return <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
}

export function NovoPedidoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [contratoId, setContratoId] = useState<number | ''>('')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<PrioridadePedido>('media')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
  })

  const listaContratos = Array.isArray(contratos) ? contratos : []

  React.useEffect(() => {
    if (listaContratos.length === 1 && !contratoId) {
      setContratoId(listaContratos[0].id)
    }
  }, [listaContratos, contratoId])

  const createMutation = useMutation({
    mutationFn: (data: FormData) => clientService.pedidos.create(data),
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      toast.success(`Pedido ${pedido.protocolo} aberto com sucesso!`, 'Novo Pedido')
      navigate(`/pedidos/${pedido.id}`)
    },
    onError: (error: any) => {
      const data = error?.response?.data
      const detail =
        data?.detail ||
        (data && typeof data === 'object'
          ? Object.entries(data)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join(' | ')
          : null) ||
        'Erro ao abrir pedido. Verifique os dados.'
      toast.error(detail, 'Falha')
    },
  })

  const processarArquivos = (novosArquivos: FileList | File[]) => {
    const list = Array.from(novosArquivos)
    if (arquivos.length + list.length > MAX_ARQUIVOS_PEDIDO) {
      toast.error(
        `Limite máximo de ${MAX_ARQUIVOS_PEDIDO} arquivos por pedido. Você já selecionou ${arquivos.length}.`,
        'Limite de Anexos'
      )
      return
    }

    const validos: File[] = []
    for (const file of list) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (EXTENSOES_PROIBIDAS.has(ext)) {
        toast.error(`O arquivo "${file.name}" possui formato proibido (.${ext}) por segurança.`, 'Formato Proibido')
        continue
      }
      if (!EXTENSOES_PERMITIDAS.has(ext)) {
        toast.error(`A extensão (.${ext}) de "${file.name}" não é permitida.`, 'Formato Inválido')
        continue
      }
      if (file.size > MAX_TAMANHO_BYTES) {
        toast.error(
          `O arquivo "${file.name}" tem ${formatarTamanho(file.size)}, excedendo o limite de 25 MB.`,
          'Arquivo Muito Grande'
        )
        continue
      }
      validos.push(file)
    }

    if (validos.length > 0) {
      setArquivos((prev) => [...prev, ...validos])
    }
  }

  const removerArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contratoId || !assunto.trim() || !descricao.trim()) return

    const formData = new FormData()
    formData.append('contrato', String(contratoId))
    formData.append('assunto', assunto.trim())
    formData.append('descricao', descricao.trim())
    formData.append('prioridade', prioridade)
    arquivos.forEach((file) => {
      formData.append('arquivos', file)
    })

    createMutation.mutate(formData)
  }

  const getErrorMessage = () => {
    if (!createMutation.error) return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
    const data = (createMutation.error as any)?.response?.data
    if (!data) return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
        .join(' | ')
    }
    return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
  }

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Operação SHM
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Abertura de Demanda
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Novo Pedido de Suporte
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Manutenção de pedidos, gestão de ciclos, arquivos e solicitação de orçamento técnico
            </p>
          </div>
        </div>

        <div className="max-w-3xl">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          {createMutation.isError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-300 text-xs font-black">
              {getErrorMessage()}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Contrato Vinculado *
            </label>
            <select
              required
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 cursor-pointer shadow-xs"
            >
              <option value="">Selecione um contrato ativo...</option>
              {listaContratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — Saldo disponível: {Number(c.saldo).toFixed(1)}h
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Assunto / Título Resumido *
            </label>
            <input
              type="text"
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="ex: Erro ao emitir relatório de notas ou solicitação de novo layout"
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Descrição Detalhada do Problema / Necessidade *
            </label>
            <textarea
              required
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique o que precisa ser feito, detalhes do problema, passos para reproduzir ou escopo desejado..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 leading-relaxed shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nível de Prioridade
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['baixa', 'media', 'alta', 'urgente'] as PrioridadePedido[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridade(p)}
                  className={`py-3 text-xs font-black rounded-2xl border capitalize transition duration-150 cursor-pointer ${
                    prioridade === p
                      ? p === 'urgente'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : p === 'alta'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Seção de Anexos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider">
                Documentos e Anexos da Demanda (Opcional)
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                arquivos.length >= MAX_ARQUIVOS_PEDIDO
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {arquivos.length} de {MAX_ARQUIVOS_PEDIDO} arquivos
              </span>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files) {
                  processarArquivos(e.dataTransfer.files)
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-inner'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp,.mp3,.zip,.rar"
                onChange={(e) => {
                  if (e.target.files) {
                    processarArquivos(e.target.files)
                    e.target.value = ''
                  }
                }}
              />
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">Clique para selecionar</span> ou arraste arquivos até aqui
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Até 10 arquivos (máx 25 MB cada). Formatos: PDF, DOCX, XLSX, imagens, compactados e áudios MP3.
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {arquivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {arquivos.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getIconeArquivo(file.name)}
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono shrink-0">
                        {formatarTamanho(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerArquivo(idx)}
                      className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition shrink-0 cursor-pointer"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Pedido...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Abrir Pedido</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </AppLayout>
  )
}