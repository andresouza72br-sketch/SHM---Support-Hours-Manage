import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Mail,
  RotateCcw,
  Send,
  Loader2,
  Shield,
  Layers,
  Users,
  FileText,
  Clock,
  KeyRound,
  DollarSign,
  Sliders,
  X,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import type { ConfiguracaoNotificacao } from '../types'


const CATEGORIAS: { id: string; label: string; icon: any }[] = [
  { id: 'todas', label: 'Todos os Eventos', icon: Sliders },
  { id: 'pedidos', label: 'Chamados & Pedidos', icon: Layers },
  { id: 'ciclos', label: 'Orçamentos & Aceites', icon: Clock },
  { id: 'contratos', label: 'Contratos & Vigência', icon: FileText },
  { id: 'saldo', label: 'Saldo & Franquia', icon: DollarSign },
  { id: 'clientes', label: 'Clientes & Usuários', icon: Users },
  { id: 'autenticacao', label: 'Autenticação & Acesso', icon: KeyRound },
]

export function ConfiguracoesNotificacoesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [eventoSelecionado, setEventoSelecionado] = useState<ConfiguracaoNotificacao | null>(null)
  const [novoEmailAdicional, setNovoEmailAdicional] = useState('')

  // Consulta as configurações
  const { data: configuracoes = [], isLoading } = useQuery({
    queryKey: ['configuracoes-notificacoes'],
    queryFn: clientService.configuracoesNotificacoes.list,
  })

  // Mutação para atualizar uma configuração
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConfiguracaoNotificacao> }) =>
      clientService.configuracoesNotificacoes.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ConfiguracaoNotificacao[]>(['configuracoes-notificacoes'], (old = []) =>
        old.map((c) => (c.id === updated.id ? updated : c))
      )
      if (eventoSelecionado?.id === updated.id) {
        setEventoSelecionado(updated)
      }
      toast.success('Configuração atualizada com sucesso.', 'Notificações')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Falha ao salvar configuração.'
      toast.error(msg, 'Erro')
    },
  })

  // Mutação para resetar padrões
  const resetMutation = useMutation({
    mutationFn: clientService.configuracoesNotificacoes.resetarPadroes,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-notificacoes'] })
      setEventoSelecionado(null)
      toast.success(`Todas as ${res.total} configurações foram restauradas para o padrão.`, 'Padrões Restaurados')
    },
    onError: () => {
      toast.error('Erro ao restaurar configurações padrão.', 'Erro')
    },
  })

  // Mutação para testar disparo
  const testarMutation = useMutation({
    mutationFn: (id: number) => clientService.configuracoesNotificacoes.testarDisparo(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      toast.success(res.mensagem, 'Disparo de Teste Realizado')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Erro ao enviar e-mail de teste.'
      toast.error(msg, 'Falha no Teste')
    },
  })

  // Filtros
  const configuracoesFiltradas = useMemo(() => {
    if (categoriaAtiva === 'todas') return configuracoes
    return configuracoes.filter((c) => c.categoria === categoriaAtiva)
  }, [configuracoes, categoriaAtiva])

  // Estatísticas
  const stats = useMemo(() => {
    const total = configuracoes.length
    const emailAtivos = configuracoes.filter((c) => c.ativo_email).length
    const inAppAtivos = configuracoes.filter((c) => c.ativo_in_app).length
    return { total, emailAtivos, inAppAtivos }
  }, [configuracoes])

  const handleToggle = (cfg: ConfiguracaoNotificacao, campo: 'ativo_email' | 'ativo_in_app') => {
    if (cfg.bloqueado_edicao && campo === 'ativo_email') {
      toast.info('Este evento é obrigatório para a segurança do sistema e não pode ser desativado.', 'Bloqueado')
      return
    }
    updateMutation.mutate({
      id: cfg.id,
      data: { [campo]: !cfg[campo] },
    })
  }

  const handleTogglePapel = (campo: keyof ConfiguracaoNotificacao) => {
    if (!eventoSelecionado) return
    const valorAtual = Boolean(eventoSelecionado[campo])
    updateMutation.mutate({
      id: eventoSelecionado.id,
      data: { [campo]: !valorAtual },
    })
  }

  const handleAdicionarEmail = () => {
    if (!eventoSelecionado || !novoEmailAdicional.trim() || !novoEmailAdicional.includes('@')) {
      toast.info('Digite um endereço de e-mail válido.', 'Atenção')
      return
    }
    const lista = [...(eventoSelecionado.emails_adicionais || [])]
    if (!lista.includes(novoEmailAdicional.trim())) {
      lista.push(novoEmailAdicional.trim())
      updateMutation.mutate({
        id: eventoSelecionado.id,
        data: { emails_adicionais: lista },
      })
      setNovoEmailAdicional('')
    }
  }

  const handleRemoverEmail = (emailParaRemover: string) => {
    if (!eventoSelecionado) return
    const lista = (eventoSelecionado.emails_adicionais || []).filter((e) => e !== emailParaRemover)
    updateMutation.mutate({
      id: eventoSelecionado.id,
      data: { emails_adicionais: lista },
    })
  }

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                <Sliders className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Governança de Notificações & E-mails
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure quais ações do sistema disparam e-mails ou alertas in-app e defina a matriz de destinatários por papel corporativo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Deseja realmente restaurar todas as notificações para as configurações originais de fábrica?')) {
                  resetMutation.mutate()
                }
              }}
              disabled={resetMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Restaurar Padrões
            </button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Eventos Monitorados</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
            </div>
            <span className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
              <Sliders className="w-5 h-5" />
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disparos de E-mail</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.emailAtivos} <span className="text-xs font-normal text-slate-400">/ {stats.total} ativos</span>
              </div>
            </div>
            <span className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notificações In-App</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.inAppAtivos} <span className="text-xs font-normal text-slate-400">/ {stats.total} ativos</span>
              </div>
            </div>
            <span className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </span>
          </div>
        </div>

        {/* Barra de Abas por Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon
            const active = categoriaAtiva === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Lista de Eventos */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            Carregando configurações de notificações...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configuracoesFiltradas.map((cfg) => (
              <div
                key={cfg.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {cfg.categoria_display}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
                        {cfg.nome}
                        {cfg.bloqueado_edicao && (
                          <span title="Evento essencial de autenticação">
                            <Shield className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => testarMutation.mutate(cfg.id)}
                        disabled={testarMutation.isPending}
                        title="Enviar e-mail de teste para o admin"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEventoSelecionado(cfg)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 transition"
                      >
                        Destinatários
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {cfg.descricao}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                  {/* Toggles E-mail / In-App */}
                  <div className="flex items-center gap-4">
                    {/* Switch E-mail */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cfg.ativo_email}
                        disabled={cfg.bloqueado_edicao}
                        onChange={() => handleToggle(cfg, 'ativo_email')}
                        className="sr-only"
                      />
                      <div
                        className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          cfg.ativo_email ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        } ${cfg.bloqueado_edicao ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            cfg.ativo_email ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        E-mail
                      </span>
                    </label>

                    {/* Switch In-App */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cfg.ativo_in_app}
                        onChange={() => handleToggle(cfg, 'ativo_in_app')}
                        className="sr-only"
                      />
                      <div
                        className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          cfg.ativo_in_app ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            cfg.ativo_in_app ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Bell className="w-3 h-3 text-slate-400" />
                        In-App
                      </span>
                    </label>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {cfg.codigo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Configuração de Destinatários */}
        {eventoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Matriz de Destinatários
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {eventoSelecionado.nome}
                  </p>
                </div>
                <button
                  onClick={() => setEventoSelecionado(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Papéis que Recebem este Evento
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Administradores da Empresa
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_empresa_admin}
                      onChange={() => handleTogglePapel('notificar_empresa_admin')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Técnicos da Empresa
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_empresa_tecnico}
                      onChange={() => handleTogglePapel('notificar_empresa_tecnico')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Gerentes / Aprovadores do Cliente
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_cliente_gerente}
                      onChange={() => handleTogglePapel('notificar_cliente_gerente')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Solicitantes Comuns do Cliente
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_cliente_comum}
                      onChange={() => handleTogglePapel('notificar_cliente_comum')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Gestor do Contrato
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_gestor_contrato}
                      onChange={() => handleTogglePapel('notificar_gestor_contrato')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Enviar Cópia para E-mails da Lista do Contrato (CC)
                    </span>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.notificar_emails_cc}
                      onChange={() => handleTogglePapel('notificar_emails_cc')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>

                  {/* Controle de Envio para o Autor */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition">
                    <div className="pr-2">
                      <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                        Não enviar para o autor (Quem executou a ação)
                      </div>
                      <div className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                        Quando ativo, quem disparou a ação não recebe cópia por e-mail deste evento.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={eventoSelecionado.nao_enviar_autor}
                      onChange={() => handleTogglePapel('nao_enviar_autor')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 dark:border-amber-700"
                    />
                  </label>
                </div>

                {/* E-mails Adicionais Fixos */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    E-mails Fixos Adicionais em Cópia
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={novoEmailAdicional}
                      onChange={(e) => setNovoEmailAdicional(e.target.value)}
                      placeholder="auditoria@empresa.com.br"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleAdicionarEmail}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(eventoSelecionado.emails_adicionais || []).map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {email}
                        <button
                          onClick={() => handleRemoverEmail(email)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setEventoSelecionado(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
