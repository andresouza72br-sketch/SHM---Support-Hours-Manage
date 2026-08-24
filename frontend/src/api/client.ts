import axios from 'axios'
import type { Pedido, Contrato, Ciclo, Tarefa, Comentario, Notification } from '../types'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to normalize DRF paginated { count, results: [] } or raw arrays []
function normalizeArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shm_access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/token/')
    ) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('shm_refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/token/refresh/', { refresh: refreshToken })
          localStorage.setItem('shm_access_token', res.data.access)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`
          }
          return api(originalRequest)
        } catch {
          localStorage.removeItem('shm_access_token')
          localStorage.removeItem('shm_refresh_token')
        }
      } else {
        localStorage.removeItem('shm_access_token')
        localStorage.removeItem('shm_refresh_token')
      }
    }
    return Promise.reject(error)
  }
)

export const clientService = {
  auth: {
    login: (credentials: { username: string; password: string }) =>
      api.post<{ access: string; refresh: string }>('/auth/token/', credentials).then((r) => r.data),
    loginGoogle: (credential: string) =>
      api.post<{ access: string; refresh: string; user: any }>('/auth/google/', { credential }).then((r) => r.data),
    me: () => api.get('/auth/me/').then((r) => r.data),
  },
  contratos: {
    list: () => api.get<any>('/contratos/').then((r) => normalizeArray<Contrato>(r.data)),
    get: (id: number) => api.get<Contrato>(`/contratos/${id}/`).then((r) => r.data),
    extrato: (id: number) => api.get(`/contratos/${id}/extrato/`).then((r) => r.data),
  },
  pedidos: {
    list: (params?: Record<string, any>) => api.get<any>('/pedidos/', { params }).then((r) => normalizeArray<Pedido>(r.data)),
    kanban: (contratoId?: number) =>
      api.get<Record<string, Pedido[]>>('/pedidos/kanban/', { params: { contrato: contratoId } }).then((r) => r.data),
    get: (id: number) => api.get<Pedido>(`/pedidos/${id}/`).then((r) => r.data),
    create: (data: Partial<Pedido>) => api.post<Pedido>('/pedidos/', data).then((r) => r.data),
  },
  ciclos: {
    get: (id: number) => api.get<Ciclo>(`/ciclos/${id}/`).then((r) => r.data),
    create: (data: { pedido: number; tipo: string; contexto: string; operador: number; horas_estimadas?: number }) =>
      api.post<Ciclo>('/ciclos/', data).then((r) => r.data),
    apresentarOrcamento: (id: number, horas_estimadas: number) =>
      api.post<Ciclo>(`/ciclos/${id}/apresentar_orcamento/`, { horas_estimadas }).then((r) => r.data),
    aprovar: (id: number) => api.post<Ciclo>(`/ciclos/${id}/aprovar/`).then((r) => r.data),
    rejeitar: (id: number, justificativa: string) =>
      api.post<Ciclo>(`/ciclos/${id}/rejeitar/`, { justificativa }).then((r) => r.data),
    iniciarExecucao: (id: number) => api.post<Ciclo>(`/ciclos/${id}/iniciar_execucao/`).then((r) => r.data),
    solicitarAceite: (id: number) => api.post<Ciclo>(`/ciclos/${id}/solicitar_aceite/`).then((r) => r.data),
    aceitar: (id: number) => api.post<Ciclo>(`/ciclos/${id}/aceitar/`).then((r) => r.data),
    recusar: (id: number, justificativa: string) =>
      api.post<Ciclo>(`/ciclos/${id}/recusar/`, { justificativa }).then((r) => r.data),
    getMagicLink: (token: string) => api.get(`/ciclos/publico/${token}/`).then((r) => r.data),
    postMagicLink: (token: string, data: { acao: string; justificativa?: string }) =>
      api.post(`/ciclos/publico/${token}/`, data).then((r) => r.data),
  },
  tarefas: {
    create: (data: Partial<Tarefa>) => api.post<Tarefa>('/tarefas/', data).then((r) => r.data),
    update: (id: number, data: Partial<Tarefa>) => api.patch<Tarefa>(`/tarefas/${id}/`, data).then((r) => r.data),
    delete: (id: number) => api.delete(`/tarefas/${id}/`).then((r) => r.data),
  },
  comunicacao: {
    list: (cicloId: number) => api.get<any>(`/comunicacao/comentarios/?ciclo=${cicloId}`).then((r) => normalizeArray<Comentario>(r.data)),
    create: (data: { ciclo: number; texto: string }) => api.post<Comentario>('/comunicacao/comentarios/', data).then((r) => r.data),
    update: (id: string, data: { texto: string }) => api.patch<Comentario>(`/comunicacao/comentarios/${id}/`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/comunicacao/comentarios/${id}/`).then((r) => r.data),
    converterEmTarefa: (id: string, data: { descricao: string; horas_estimadas: number }) =>
      api.post(`/comunicacao/comentarios/${id}/converter_em_tarefa/`, data).then((r) => r.data),
  },
  notificacoes: {
    list: () => api.get<any>('/notificacoes/notificacoes/').then((r) => normalizeArray<Notification>(r.data)),
    marcarLida: (id: number) => api.post(`/notificacoes/notificacoes/${id}/marcar_lida/`).then((r) => r.data),
    marcarTodasLidas: () => api.post('/notificacoes/notificacoes/marcar_todas_lidas/').then((r) => r.data),
  },
}