import React, { useState, useRef } from 'react'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  FileCheck,
  AlertCircle,
  Loader2,
  FilePlus2,
  ShieldCheck,
  HardDrive,
  Fingerprint,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import type { Contrato, ContratoDocumento, TipoDocumentoContrato } from '../../types'

interface DocumentosContratoModalProps {
  contrato: Contrato | null
  isOpen: boolean
  onClose: () => void
}

const TIPO_DOC_LABELS: Record<TipoDocumentoContrato, string> = {
  proposta: 'Proposta Comercial',
  contrato_assinado: 'Contrato Assinado',
  aditivo: 'Termo Aditivo',
  distrato: 'Distrato / Rescisão',
  outro: 'Outro Documento',
}

export function DocumentosContratoModal({ contrato, isOpen, onClose }: DocumentosContratoModalProps) {
  const { user, isEmpresa } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedTipo, setSelectedTipo] = useState<TipoDocumentoContrato>('proposta')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [verificationResults, setVerificationResults] = useState<Record<number, any>>({})
  const [copiedHashId, setCopiedHashId] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Gerente do cliente cadastrado neste contrato
  const isClienteGerenteDoContrato =
    user?.role === 'CLIENTE_GERENTE' &&
    !!user?.email &&
    !!contrato?.gestor_email &&
    user.email.toLowerCase() === contrato.gestor_email.toLowerCase()

  // Pode fazer download: empresa OU gerente cadastrado no contrato
  const podeDownload = isEmpresa || isClienteGerenteDoContrato

  const uploadMutation = useMutation({
    mutationFn: ({ id, file, tipo }: { id: number; file: File; tipo: string }) =>
      clientService.contratos.uploadDocumento(id, file, tipo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(`Documento "${data.nome_original}" anexado com sucesso!`, 'Upload Concluído')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.arquivo || 'Erro ao realizar upload do documento.'
      toast.error(Array.isArray(msg) ? msg[0] : msg, 'Erro no Upload')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ contratoId, docId }: { contratoId: number; docId: number }) =>
      clientService.contratos.deleteDocumento(contratoId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success('Documento removido do contrato.', 'Exclusão')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Erro ao remover documento.'
      toast.error(msg, 'Erro')
    },
  })

  if (!isOpen || !contrato) return null

  const documentos: ContratoDocumento[] = Array.isArray(contrato.documentos) ? contrato.documentos : []
  const totalDocs = documentos.length
  const limiteMax = 5
  const podeSubirMais = totalDocs < limiteMax && isEmpresa

  const handleDownload = async (doc: ContratoDocumento) => {
    try {
      setDownloadingId(doc.id)
      toast.info(`Iniciando download de "${doc.nome_original}"... (Auditoria registrada)`, 'Download')
      await clientService.contratos.downloadDocumento(contrato.id, doc.id, doc.nome_original)
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
    } catch (err: any) {
      toast.error('Erro ao baixar o arquivo. Tente novamente.', 'Download')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleCopiarHash = (hash: string, docId: number) => {
    if (!hash) return
    navigator.clipboard.writeText(hash)
    setCopiedHashId(docId)
    toast.success('Hash SHA-256 copiado para a área de transferência!', 'Copiado')
    setTimeout(() => {
      setCopiedHashId((prev) => (prev === docId ? null : prev))
    }, 2500)
  }

  const handleVerificarIntegridade = async (doc: ContratoDocumento) => {
    if (!contrato) return
    try {
      setVerifyingId(doc.id)
      const res = await clientService.contratos.verificarDocumento(contrato.id, doc.id)
      setVerificationResults((prev) => ({
        ...prev,
        [doc.id]: res,
      }))
      if (res.integro) {
        toast.success(`Documento "${doc.nome_original}" 100% íntegro e autêntico!`, 'Integridade Verificada')
      } else {
        toast.error(`Atenção: Arquivo "${doc.nome_original}" divergiu do hash original registrado!`, 'Violação de Integridade')
      }
    } catch (err: any) {
      toast.error('Erro ao verificar integridade do documento no servidor.', 'Erro')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleFileSelected = (file: File) => {
    if (totalDocs >= limiteMax) {
      toast.error(`O contrato já atingiu o limite máximo de ${limiteMax} documentos.`, 'Limite Atingido')
      return
    }
    uploadMutation.mutate({
      id: contrato.id,
      file,
      tipo: selectedTipo,
    })
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!podeSubirMais) return
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelected(files[0])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">Documentos do Contrato</h2>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    totalDocs >= limiteMax
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/60'
                  }`}
                >
                  {totalDocs} de {limiteMax} arquivos
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {contrato.numero} — {contrato.cliente_nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Upload Area (Empresa Admin) */}
          {isEmpresa && podeSubirMais && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`p-5 rounded-2xl border-2 border-dashed transition duration-150 ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">Anexar Novo Documento</h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      PDF, DOCX, Imagens ou Termos Aditivos (limite de 5 arquivos por contrato)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value as TipoDocumentoContrato)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="proposta">Proposta Comercial</option>
                    <option value="contrato_assinado">Contrato Assinado</option>
                    <option value="aditivo">Termo Aditivo</option>
                    <option value="distrato">Distrato / Rescisão</option>
                    <option value="outro">Outro Documento</option>
                  </select>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelected(e.target.files[0])
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={uploadMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>{uploadMutation.isPending ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {totalDocs >= limiteMax && isEmpresa && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Limite máximo de 5 documentos anexados atingido. Para subir um novo arquivo, remova um documento anterior.</span>
            </div>
          )}

          {/* List of Documents */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-1">
              <span>Arquivos Disponíveis ({totalDocs})</span>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Downloads registrados para auditoria</span>
              </span>
            </div>

            {documentos.map((doc) => {
              const isDownloading = downloadingId === doc.id
              const tipoLabel = TIPO_DOC_LABELS[doc.tipo_documento] || doc.tipo_documento_display || 'Documento'

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate max-w-sm" title={doc.nome_original}>
                          {doc.nome_original}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {tipoLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{doc.tamanho_formatado}</span>
                        <span>•</span>
                        <span>Enviado em {new Date(doc.criado_em).toLocaleDateString('pt-BR')}</span>
                        {doc.enviado_por_nome && (
                          <>
                            <span>•</span>
                            <span>Por {doc.enviado_por_nome}</span>
                          </>
                        )}
                      </div>

                      {/* Hash SHA-256 e Verificação de Integridade */}
                      {doc.hash_sha256 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-[10px] font-mono text-slate-700 dark:text-slate-300 shadow-2xs">
                            <Fingerprint className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-slate-500 dark:text-slate-400">SHA-256:</span>
                            <span className="font-bold tracking-tight text-slate-800 dark:text-slate-200" title={`Hash Completo: ${doc.hash_sha256}`}>
                              {doc.hash_sha256.substring(0, 8)}...{doc.hash_sha256.substring(doc.hash_sha256.length - 8)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopiarHash(doc.hash_sha256!, doc.id)
                              }}
                              className="ml-0.5 p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                              title="Copiar Hash SHA-256 completo"
                            >
                              {copiedHashId === doc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          {verificationResults[doc.id] ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs ${
                                verificationResults[doc.id].integro
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                              title={verificationResults[doc.id].mensagem}
                            >
                              {verificationResults[doc.id].integro ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-rose-600" />}
                              <span>{verificationResults[doc.id].integro ? 'Íntegro & Autêntico' : 'Violação Detectada!'}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={verifyingId === doc.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleVerificarIntegridade(doc)
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Verificar integridade do arquivo em disco contra o hash registrado"
                            >
                              {verifyingId === doc.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              ) : (
                                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                              )}
                              <span>{verifyingId === doc.id ? 'Validando...' : 'Verificar'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {podeDownload && (
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownload(doc)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Fazer download deste documento (Registra auditoria forense)"
                    >
                      {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Baixar</span>
                    </button>
                    )}

                    {isEmpresa && (
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir o documento "${doc.nome_original}"?`)) {
                            deleteMutation.mutate({ contratoId: contrato.id, docId: doc.id })
                          }
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="Remover documento do contrato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {totalDocs === 0 && (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <HardDrive className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum documento anexado a este contrato ainda.</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEmpresa
                    ? 'Faça o upload de cópias de propostas, aditivos e contratos assinados acima (até 5 arquivos).'
                    : 'Aguardando o envio de cópias de propostas e termos pela empresa gestora.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Formatos recomendados: PDF, DOCX, XLSX, PNG, JPG (até 25MB por arquivo)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
