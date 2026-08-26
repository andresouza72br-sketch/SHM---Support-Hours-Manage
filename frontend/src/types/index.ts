export type UserRole = 'EMPRESA_ADMIN' | 'EMPRESA_TECNICO' | 'CLIENTE_GERENTE' | 'CLIENTE_ANALISTA'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  role: UserRole
  role_display: string
  telefone?: string | null
  cliente?: number | null
  cliente_nome?: string | null
  is_staff: boolean
  is_superuser?: boolean
  can_approve_cycles?: boolean
  is_empresa?: boolean
  is_cliente?: boolean
}

export interface EmailNotificacao {
  id?: number
  email: string
  nome?: string
  ativo: boolean
  status?: 'pendente' | 'confirmado' | 'recusado' | 'expirado'
  status_display?: string
  token?: string
  convidado_por_nome?: string
  convidado_em?: string
  expira_em?: string
  confirmado_em?: string
  is_expirado?: boolean
  dias_restantes?: number
}

export interface Cliente {
  id: number
  tipo: 'PF' | 'PJ'
  razao_social?: string
  nome_fantasia?: string
  nome_completo?: string
  display_name: string
  cnpj?: string
  cpf?: string
  email_contato: string
  telefone?: string
  pessoa_contato?: string
  logo?: string | null
  logo_url?: string | null
  emails_notificacao_padrao?: EmailNotificacao[]
  status: 'ativo' | 'inativo'
}

export type TipoDocumentoContrato = 'proposta' | 'contrato_assinado' | 'aditivo' | 'distrato' | 'outro'

export interface ContratoDocumento {
  id: number
  nome_original: string
  tipo_documento: TipoDocumentoContrato
  tipo_documento_display: string
  tamanho_bytes: number
  tamanho_formatado: string
  hash_sha256?: string
  algoritmo_hash?: string
  url: string
  enviado_por?: number | null
  enviado_por_nome?: string | null
  criado_em: string
}

export interface ContratoAuditLog {
  id: number
  contrato: number
  tipo_evento: string
  tipo_evento_display: string
  descricao: string
  justificativa?: string | null
  documento_nome?: string | null
  documento_hash?: string | null
  usuario?: number | null
  usuario_nome?: string | null
  usuario_role?: string | null
  ip_origem?: string | null
  timestamp: string
}

export interface ContratoPDF {
  id: number
  nome_original: string
  url: string
  criado_em: string
}

export interface Contrato {
  id: number
  numero: string
  tipo: 'novo' | 'aditivo' | 'renovacao'
  tipo_display?: string
  contrato_referencia?: number | null
  cliente: number
  cliente_nome: string
  cliente_logo?: string | null
  data_inicio: string
  data_termino?: string | null
  horas_contratadas: string | number
  saldo: string | number
  horas_consumidas: string | number
  status: 'pendente_aceite' | 'ativo' | 'concluido' | 'cancelado' | 'suspenso' | 'expirado'
  status_display: string
  em_carencia: boolean
  saldo_devedor: string | number
  saldo_remanescente: string | number
  descricao_servicos?: string
  valor_mensal?: string | number
  dia_faturamento?: number | null
  gestor_nome?: string | null
  gestor_email?: string | null
  gestor_telefone?: string | null
  emails_notificacao?: EmailNotificacao[]
  justificativa_cancelamento?: string | null
  cancelado_por_nome?: string | null
  cancelado_em?: string | null
  concluido_por_nome?: string | null
  concluido_em?: string | null
  criado_por_nome?: string | null
  total_documentos?: number
  documentos?: ContratoDocumento[]
  destinatarios?: EmailNotificacao[]
  pdfs?: ContratoPDF[]
  aceite_token?: string | null
  aceite_expira_em?: string | null
  aceite_usado?: boolean
}

export interface Tarefa {
  id: number
  ciclo: number
  descricao: string
  horas_estimadas: string | number
  horas_realizadas: string | number
  status: 'prevista' | 'realizada' | 'cancelada'
  status_display: string
  operador?: number | null
  operador_nome?: string | null
}

export type TipoCiclo = 'corretiva' | 'evolutiva' | 'preventiva' | 'analise' | 'consultoria' | 'treinamento'
export type StatusCiclo = 'orcado' | 'aguardando_aprovacao' | 'aprovado' | 'em_execucao' | 'aguardando_aceite' | 'aceito' | 'cancelado'

export interface Ciclo {
  id: number
  pedido: number
  tipo: TipoCiclo
  tipo_display: string
  contexto?: string | null
  operador: number
  operador_nome: string
  status: StatusCiclo
  status_display: string
  horas_estimadas: string | number
  horas_realizadas: string | number
  apresentado_em?: string | null
  aprovado_em?: string | null
  aceito_em?: string | null
  token_acesso: string
  tarefas: Tarefa[]
}

export interface AnexoPedido {
  id: number
  nome_original: string
  tamanho: number
  url: string
  criado_em: string
}

export type PrioridadePedido = 'baixa' | 'media' | 'alta' | 'urgente'
export type StatusPedido = 'aberto' | 'em_orcamento' | 'aguardando_aprovacao' | 'em_execucao' | 'aguardando_aceite' | 'concluido' | 'cancelado'

export interface PedidoResumoCiclo {
  id: number
  tipo: string
  status: string
  status_display: string
  horas_estimadas: number
  horas_realizadas: number
}

export interface Pedido {
  id: number
  protocolo: string
  assunto: string
  descricao: string
  prioridade: PrioridadePedido
  prioridade_display: string
  status: StatusPedido
  status_display: string
  cliente: number
  cliente_nome: string
  contrato: number
  contrato_numero: string
  contrato_saldo?: string | number
  criado_em: string
  ciclos_resumo?: PedidoResumoCiclo[]
  ciclos?: Ciclo[]
  anexos?: AnexoPedido[]
}

export interface Comentario {
  id: string
  ciclo?: number | null
  tarefa?: number | null
  autor: number
  autor_nome: string
  autor_role: string
  autor_username?: string
  autor_avatar_url?: string | null
  texto: string
  tarefa_convertida?: number | null
  criado_em: string
  atualizado_em?: string
  anexos?: { id: string; nome_original: string; url: string }[]
}

export interface TimelineEvent {
  id: number
  pedido: number
  ciclo?: number | null
  tipo: string
  tipo_display: string
  descricao: string
  autor_nome?: string | null
  timestamp: string
}

export interface Notification {
  id: number
  titulo: string
  mensagem: string
  url?: string | null
  lida: boolean
  criado_em: string
}