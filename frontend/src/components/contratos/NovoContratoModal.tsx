import React, { useState, useEffect } from 'react'
import {
  FilePlus,
  X,
  Building2,
  Clock,
  Mail,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  FileCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Cliente, Contrato, EmailNotificacao, TipoDocumentoContrato } from '../../types'

interface NovoContratoModalProps {
  isOpen: boolean
  onClose: () => void
  contratoParaEditar?: Contrato | null
}

type TabType = 'geral' | 'financeiro' | 'notificacoes' | 'documentos'

export function NovoContratoModal({ isOpen, onClose, contratoParaEditar }: NovoContratoModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = Boolean(contratoParaEditar)

  const [activeTab, setActiveTab] = useState<TabType>('geral')
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [tipo, setTipo] = useState<'novo' | 'aditivo' | 'renovacao'>('novo')
  const [contratoRefId, setContratoRefId] = useState<number | ''>('')
  const [numeroCustom, setNumeroCustom] = useState('')
  const [descricaoServicos, setDescricaoServicos] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [dataFimCarencia, setDataFimCarencia] = useState('')
  const [horasContratadas, setHorasContratadas] = useState('100.00')
  const [valorMensal, setValorMensal] = useState('')
  const [diaFaturamento, setDiaFaturamento] = useState<number | ''>('')
  const [statusInicial, setStatusInicial] = useState<'pendente_aceite' | 'ativo'>('ativo')

  const [gestorNome, setGestorNome] = useState('')
  const [gestorEmail, setGestorEmail] = useState('')
  const [gestorTelefone, setGestorTelefone] = useState('')
  const [emailsNotificacao, setEmailsNotificacao] = useState<EmailNotificacao[]>([])

  const [novoEmailInput, setNovoEmailInput] = useState('')
  const [novoNomeInput, setNovoNomeInput] = useState('')

  // Selected files for new upload (up to 5)
  const [arquivosParaUpload, setArquivosParaUpload] = useState<{ file: File; tipo: TipoDocumentoContrato }[]>([])

  // Load clients list
  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes_select'],
    queryFn: clientService.clientes.list,
    enabled: isOpen,
  })

  // Load existing contracts for reference (if aditivo/renovacao)
  const { data: contratosExistentes = [] } = useQuery<Contrato[]>({
    queryKey: ['contratos_select'],
    queryFn: clientService.contratos.list,
    enabled: isOpen,
  })

  // Populate on edit
  useEffect(() => {
    if (contratoParaEditar) {
      setClienteId(contratoParaEditar.cliente || '')
      setTipo(contratoParaEditar.tipo || 'novo')
      setContratoRefId(contratoParaEditar.contrato_referencia || '')
      setNumeroCustom(contratoParaEditar.numero || '')
      setDescricaoServicos(contratoParaEditar.descricao_servicos || '')
      setObservacoes((contratoParaEditar as any).observacoes || '')
      setDataInicio(contratoParaEditar.data_inicio || '')
      setDataTermino(contratoParaEditar.data_termino || '')
      setDataFimCarencia((contratoParaEditar as any).data_fim_carencia || '')
      setHorasContratadas(String(contratoParaEditar.horas_contratadas || '100.00'))
      setValorMensal(contratoParaEditar.valor_mensal ? String(contratoParaEditar.valor_mensal) : '')
      setDiaFaturamento(contratoParaEditar.dia_faturamento || '')
      setStatusInicial(contratoParaEditar.status === 'pendente_aceite' ? 'pendente_aceite' : 'ativo')
      setGestorNome(contratoParaEditar.gestor_nome || '')
      setGestorEmail(contratoParaEditar.gestor_email || '')
      setGestorTelefone(contratoParaEditar.gestor_telefone || '')
      setEmailsNotificacao(Array.isArray(contratoParaEditar.emails_notificacao) ? contratoParaEditar.emails_notificacao : [])
      setArquivosParaUpload([])
    } else {
      // Defaults for new contract
      const hojeStr = new Date().toISOString().split('T')[0]
      const umAnoDepois = new Date()
      umAnoDepois.setFullYear(umAnoDepois.getFullYear() + 1)
      const dataTerminoStr = umAnoDepois.toISOString().split('T')[0]

      setClienteId('')
      setTipo('novo')
      setContratoRefId('')
      setNumeroCustom('')
      setDescricaoServicos('')
      setObservacoes('')
      setDataInicio(hojeStr)
      setDataTermino(dataTerminoStr)
      setDataFimCarencia('')
      setHorasContratadas('100.00')
      setValorMensal('')
      setDiaFaturamento(10)
      setStatusInicial('ativo')
      setGestorNome('')
      setGestorEmail('')
      setGestorTelefone('')
      setEmailsNotificacao([])
      setArquivosParaUpload([])
    }
    setActiveTab('geral')
    setError(null)
  }, [contratoParaEditar, isOpen])

  // When client is selected, copy default notification emails if empty
  const handleClienteChange = (cId: number) => {
    setClienteId(cId)
    const cli = clientes.find((c) => c.id === cId)
    if (cli) {
      if (cli.pessoa_contato && !gestorNome) setGestorNome(cli.pessoa_contato)
      if (cli.email_contato && !gestorEmail) setGestorEmail(cli.email_contato)
      if (cli.telefone && !gestorTelefone) setGestorTelefone(cli.telefone)
      if (emailsNotificacao.length === 0 && cli.email_contato) {
        setEmailsNotificacao([
          { email: cli.email_contato, nome: cli.pessoa_contato || 'Contato Principal', ativo: true },
        ])
      }
    }
  }

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const emailLimpo = novoEmailInput.trim().toLowerCase()
    if (!emailLimpo) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLimpo)) {
      setError('Por favor, digite um e-mail válido.')
      return
    }

    if (emailsNotificacao.some((item) => item.email.toLowerCase() === emailLimpo)) {
      setError('Este e-mail já foi adicionado.')
      return
    }

    setEmailsNotificacao((prev) => [
      ...prev,
      { email: emailLimpo, nome: novoNomeInput.trim() || undefined, ativo: true },
    ])
    setNovoEmailInput('')
    setNovoNomeInput('')
    setError(null)
  }

  const handleAddArquivo = (files: FileList | null, tipoDoc: TipoDocumentoContrato = 'proposta') => {
    if (!files || files.length === 0) return
    const novos: { file: File; tipo: TipoDocumentoContrato }[] = []
    const totalAtual = arquivosParaUpload.length + (contratoParaEditar?.documentos?.length || 0)

    for (let i = 0; i < files.length; i++) {
      if (totalAtual + novos.length >= 5) {
        toast.info('Limite máximo de 5 arquivos atingido.', 'Limite de Anexos')
        break
      }
      novos.push({ file: files[i], tipo: tipoDoc })
    }

    setArquivosParaUpload((prev) => [...prev, ...novos])
  }

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      let contratoSalvo: Contrato
      if (isEditing && contratoParaEditar) {
        contratoSalvo = await clientService.contratos.update(contratoParaEditar.id, payload)
      } else {
        contratoSalvo = await clientService.contratos.create(payload)
      }

      // Upload attached files
      if (arquivosParaUpload.length > 0) {
        for (const item of arquivosParaUpload) {
          try {
            await clientService.contratos.uploadDocumento(contratoSalvo.id, item.file, item.tipo)
          } catch (uploadErr) {
            console.error('Erro ao subir anexo:', uploadErr)
          }
        }
      }

      return contratoSalvo
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(
        `Contrato ${data.numero} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`,
        isEditing ? 'Contrato Atualizado' : 'Contrato Criado'
      )
      onClose()
    },
    onError: (err: any) => {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0]
        const val = data[firstKey]
        setError(`${firstKey}: ${Array.isArray(val) ? val[0] : val}`)
      } else {
        setError('Erro ao salvar contrato. Verifique os campos preenchidos.')
      }
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) {
      setError('Por favor, selecione o cliente vinculado ao contrato.')
      setActiveTab('geral')
      return
    }

    if (!dataInicio) {
      setError('Por favor, informe a data de início da vigência.')
      setActiveTab('financeiro')
      return
    }

    const horasNum = Number(horasContratadas)
    if (isNaN(horasNum) || horasNum <= 0) {
      setError('A franquia de horas contratadas deve ser maior que zero.')
      setActiveTab('financeiro')
      return
    }

    setError(null)

    const payload: any = {
      cliente: Number(clienteId),
      tipo,
      contrato_referencia: contratoRefId ? Number(contratoRefId) : null,
      data_inicio: dataInicio,
      data_termino: dataTermino || null,
      data_fim_carencia: dataFimCarencia || null,
      horas_contratadas: horasNum,
      descricao_servicos: descricaoServicos,
      observacoes,
      valor_mensal: valorMensal ? Number(valorMensal) : null,
      dia_faturamento: diaFaturamento ? Number(diaFaturamento) : null,
      status: statusInicial,
      gestor_nome: gestorNome,
      gestor_email: gestorEmail,
      gestor_telefone: gestorTelefone,
      emails_notificacao: emailsNotificacao,
    }

    if (numeroCustom.trim()) {
      payload.numero = numeroCustom.trim().toUpperCase()
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full h-[670px] max-h-[92vh] flex flex-col overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
              <FilePlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isEditing ? `Editar Contrato ${contratoParaEditar?.numero}` : 'Cadastro de Contrato de Suporte'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Controle de franquia de horas, vigência, documentos e lista de e-mails para notificações
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'geral'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Contrato</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'financeiro'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Financeiro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notificacoes')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'notificacoes'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Notificações</span>
            {emailsNotificacao.length > 0 && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                {emailsNotificacao.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'documentos'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Documentos</span>
            {arquivosParaUpload.length > 0 && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                {arquivosParaUpload.length}/5
              </span>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 flex flex-col justify-center">
            <div className="w-full max-w-3xl mx-auto my-auto">
              {/* TAB 1: CONTRATO */}
              {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Cliente Vinculado <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => handleClienteChange(Number(e.target.value))}
                    required
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">Selecione a empresa / cliente...</option>
                    {clientes.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.display_name} {cli.cnpj ? `(CNPJ: ${cli.cnpj})` : cli.cpf ? `(CPF: ${cli.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Tipo de Contrato <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="novo">Contrato Novo</option>
                    <option value="aditivo">Termo Aditivo</option>
                    <option value="renovacao">Renovação de Contrato</option>
                  </select>
                </div>
              </div>

              {tipo !== 'novo' && (
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Contrato de Referência (Principal)
                  </label>
                  <select
                    value={contratoRefId}
                    onChange={(e) => setContratoRefId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">Selecione o contrato de origem...</option>
                    {contratosExistentes
                      .filter((c) => !contratoParaEditar || c.id !== contratoParaEditar.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero} — {c.cliente_nome} ({c.status_display})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Número do Contrato <span className="text-slate-400 font-normal">(opcional - auto se vazio)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CT-2026-0009"
                    value={numeroCustom}
                    onChange={(e) => setNumeroCustom(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs uppercase placeholder:normal-case placeholder:font-sans"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Deixe em branco para gerar o sequencial automático padrão (CT-YYYY-NNNN).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Status Inicial & Aceite
                  </label>
                  <select
                    value={statusInicial}
                    onChange={(e) => setStatusInicial(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="pendente_aceite">Pendente de Aceite (Envia link ao responsável para autorizar início dos trabalhos)</option>
                    <option value="ativo">Ativo Imediato (Dispensa aceite prévio / já formalizado)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {statusInicial === 'pendente_aceite'
                      ? '✉️ O gestor/responsável receberá um e-mail com link seguro para conferir o contrato e autorizar o início dos trabalhos.'
                      : '⚡ O contrato estará pronto imediatamente para abertura de chamados e execução técnica.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Objeto & Descrição dos Serviços Contratados
                </label>
                <textarea
                  rows={3}
                  value={descricaoServicos}
                  onChange={(e) => setDescricaoServicos(e.target.value)}
                  placeholder="Ex: Suporte N2/N3 especializado em banco de dados PostgreSQL, ERP, sustentação cloud 24/7 e consultoria técnica."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Observações Gerais e Cláusulas Internas
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações internas, condições comerciais e termos de faturamento..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* TAB 2: FRANQUIA, PRAZOS & FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Data de Início <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Data de Término (Vigência)
                  </label>
                  <input
                    type="date"
                    value={dataTermino}
                    onChange={(e) => setDataTermino(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Data Fim de Carência <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={dataFimCarencia}
                    onChange={(e) => setDataFimCarencia(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Franquia de Horas (Horas) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={horasContratadas}
                      onChange={(e) => setHorasContratadas(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 pr-8 font-black text-indigo-700 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="absolute right-3 top-3 text-xs font-black text-slate-400">h</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Saldo inicial creditado no contrato.</span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Valor Mensal (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={valorMensal}
                      onChange={(e) => setValorMensal(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 pl-8 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Dia de Faturamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    value={diaFaturamento}
                    onChange={(e) => setDiaFaturamento(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICAÇÕES & GESTOR */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Gestor / Ponto Focal Responsável pelo Contrato</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Nome do Gestor (ex: Roberto Silva)"
                    value={gestorNome}
                    onChange={(e) => setGestorNome(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <input
                    type="email"
                    placeholder="E-mail do Gestor (ex: roberto@empresa.com)"
                    value={gestorEmail}
                    onChange={(e) => setGestorEmail(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <input
                    type="text"
                    placeholder="Telefone / WhatsApp (ex: 11 98888-7777)"
                    value={gestorTelefone}
                    onChange={(e) => setGestorTelefone(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Lista de E-mails com Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Lista de E-mails para Notificações Periódicas
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Use os checkboxes (check) para ativar/desativar o envio de avisos de saldo, aberturas e extratos.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Confirmação de Consentimento:</strong> Ao salvar o contrato, cada e-mail cadastrado receberá um convite por e-mail com <strong>Magic Link seguro com validade de 15 dias</strong> para aceitar o recebimento de notificações.
                  </p>
                </div>

                {/* Adicionar */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="email"
                    placeholder="Novo e-mail (ex: diretoria@cliente.com)"
                    value={novoEmailInput}
                    onChange={(e) => setNovoEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                    className="w-full sm:flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <input
                    type="text"
                    placeholder="Nome / Função (opcional)"
                    value={novoNomeInput}
                    onChange={(e) => setNovoNomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                    className="w-full sm:w-48 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEmail()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-500/20 transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {emailsNotificacao.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setEmailsNotificacao((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, ativo: !it.ativo } : it))
                        )
                      }}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                        item.ativo
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.ativo}
                          onChange={() => {
                            setEmailsNotificacao((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, ativo: !it.ativo } : it))
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                            {item.email}
                          </span>
                          {item.nome && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                              {item.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                            item.ativo
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEmailsNotificacao((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {emailsNotificacao.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      Nenhum e-mail de notificação configurado para este contrato.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTOS & ANEXOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Anexar Documentos (Limite de até 5 arquivos por contrato)
                    </h3>
                  </div>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                    {arquivosParaUpload.length + (contratoParaEditar?.documentos?.length || 0)} de 5 arquivos
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Guarde cópias de propostas comerciais, termos de contrato assinados, aditivos e distratos referentes a este contrato.
                </p>

                {arquivosParaUpload.length + (contratoParaEditar?.documentos?.length || 0) < 5 && (
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <input
                      type="file"
                      id="file-contract-upload"
                      className="hidden"
                      multiple
                      onChange={(e) => handleAddArquivo(e.target.files)}
                    />
                    <label
                      htmlFor="file-contract-upload"
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-xl text-xs font-black border border-indigo-200 dark:border-indigo-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Selecionar Arquivos (PDF, DOCX, Imagem)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Máx. 25MB por arquivo</span>
                  </div>
                )}
              </div>

              {/* Lista de Arquivos Selecionados */}
              <div className="space-y-2">
                {arquivosParaUpload.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.tipo}
                        onChange={(e) => {
                          const novoTipo = e.target.value as TipoDocumentoContrato
                          setArquivosParaUpload((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, tipo: novoTipo } : it))
                          )
                        }}
                        className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200"
                      >
                        <option value="proposta">Proposta Comercial</option>
                        <option value="contrato_assinado">Contrato Assinado</option>
                        <option value="aditivo">Termo Aditivo</option>
                        <option value="distrato">Distrato / Rescisão</option>
                        <option value="outro">Outro Documento</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setArquivosParaUpload((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {arquivosParaUpload.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    Nenhum novo documento selecionado para upload neste momento.
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-8 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'geral' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'documentos') setActiveTab('notificacoes')
                    else if (activeTab === 'notificacoes') setActiveTab('financeiro')
                    else if (activeTab === 'financeiro') setActiveTab('geral')
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  Voltar
                </button>
              )}

              {activeTab !== 'documentos' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'geral') setActiveTab('financeiro')
                    else if (activeTab === 'financeiro') setActiveTab('notificacoes')
                    else if (activeTab === 'notificacoes') setActiveTab('documentos')
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  Avançar
                </button>
              )}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Contrato...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
