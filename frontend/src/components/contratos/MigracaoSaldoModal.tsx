import React, { useState, useEffect } from 'react'
import { ArrowRight, Zap, AlertCircle, Loader2, X, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Contrato } from '../../types'

interface ContratoElegivel {
  id: number
  numero: string
  saldo: string
  horas_contratadas: string
  horas_consumidas: string
  status: string
  status_display: string
  data_inicio: string | null
  data_termino: string | null
  data_fim_carencia: string | null
  em_carencia: boolean
}

interface MigracaoSaldoModalProps {
  contratoDestino: Contrato | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function MigracaoSaldoModal({ contratoDestino, isOpen, onClose, onSuccess }: MigracaoSaldoModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [origemSelecionadaId, setOrigemSelecionadaId] = useState<number | null>(null)
  const [quantidade, setQuantidade] = useState<string>('')
  const [motivo, setMotivo] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const clienteId = contratoDestino?.cliente

  const { data: elegiveis = [], isLoading, refetch } = useQuery<ContratoElegivel[]>({
    queryKey: ['contratos-elegiveis-saldo', clienteId, contratoDestino?.id],
    queryFn: () => {
      if (!clienteId) return Promise.resolve([])
      return clientService.saldo.contratosElegiveis(clienteId, contratoDestino?.id)
    },
    enabled: isOpen && !!clienteId,
  })

  // Auto-selecionar o primeiro contrato elegível e preencher quantidade total
  useEffect(() => {
    if (elegiveis.length > 0) {
      const primeiro = elegiveis[0]
      setOrigemSelecionadaId(primeiro.id)
      setQuantidade(primeiro.saldo)
      setMotivo(`Aproveitamento de saldo do contrato encerrado ${primeiro.numero}`)
    } else {
      setOrigemSelecionadaId(null)
      setQuantidade('')
      setMotivo('')
    }
  }, [elegiveis])

  const contratoOrigem = elegiveis.find((c) => c.id === origemSelecionadaId)

  const saldoOrigemNum = contratoOrigem ? parseFloat(contratoOrigem.saldo) || 0 : 0
  const saldoDestinoAtualNum = contratoDestino ? parseFloat(contratoDestino.saldo as any) || 0 : 0
  const qtdMigrarNum = parseFloat(quantidade) || 0
  const saldoDestinoProjetado = saldoDestinoAtualNum + qtdMigrarNum
  const saldoOrigemRestante = Math.max(0, saldoOrigemNum - qtdMigrarNum)

  const handleOrigemChange = (id: number) => {
    setOrigemSelecionadaId(id)
    const selecionado = elegiveis.find((c) => c.id === id)
    if (selecionado) {
      setQuantidade(selecionado.saldo)
      setMotivo(`Aproveitamento de saldo do contrato encerrado ${selecionado.numero}`)
      setError(null)
    }
  }

  const handleSetPercent = (percent: number) => {
    if (!contratoOrigem) return
    const total = parseFloat(contratoOrigem.saldo) || 0
    const valor = ((total * percent) / 100).toFixed(2)
    setQuantidade(valor)
    setError(null)
  }

  const migrarMutation = useMutation({
    mutationFn: (data: { contrato_origem: number; contrato_destino: number; quantidade?: number; motivo?: string }) =>
      clientService.saldo.migrar(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      toast.success(
        `Migração de ${data.quantidade}h realizada com sucesso para o contrato ${contratoDestino?.numero}!`,
        'Saldo Aproveitado'
      )
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.quantidade || 'Erro ao realizar migração de saldo.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    },
  })

  if (!isOpen || !contratoDestino) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!origemSelecionadaId) {
      setError('Selecione o contrato de origem.')
      return
    }
    if (isNaN(qtdMigrarNum) || qtdMigrarNum <= 0) {
      setError('Informe uma quantidade de horas válida maior que zero.')
      return
    }
    if (qtdMigrarNum > saldoOrigemNum) {
      setError(`A quantidade informada (${qtdMigrarNum}h) não pode exceder o saldo disponível (${saldoOrigemNum}h).`)
      return
    }

    setError(null)
    migrarMutation.mutate({
      contrato_origem: origemSelecionadaId,
      contrato_destino: contratoDestino.id,
      quantidade: qtdMigrarNum,
      motivo: motivo.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-violet-500/10 dark:from-amber-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
                  Assistente de Saldo
                </span>
                <span className="text-[10px] font-bold text-slate-400">•</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Contratos Vencidos</span>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Migrar / Aproveitar Saldo Remanescente
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Buscando contratos elegíveis para migração...</p>
            </div>
          ) : elegiveis.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhum saldo remanescente disponível
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Não foram localizados outros contratos expirados ou concluídos com saldo positivo para o cliente{' '}
                  <strong>{contratoDestino.cliente_nome}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar consulta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contrato Destino Info */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Contrato de Destino (Recebedor)
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                      {contratoDestino.numero}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">• {contratoDestino.cliente_nome}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Saldo Atual</span>
                  <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {Number(contratoDestino.saldo || 0).toFixed(2)}h
                  </span>
                </div>
              </div>

              {/* Contrato Origem Selection */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-2">
                  1. Selecione o Contrato Vencido de Origem ({elegiveis.length} disponível{elegiveis.length > 1 ? 'is' : ''})
                </label>
                <div className="space-y-2">
                  {elegiveis.map((item) => {
                    const isSelected = item.id === origemSelecionadaId
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOrigemChange(item.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-400/50'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-amber-600 bg-amber-600 dark:border-amber-400 dark:bg-amber-400'
                                : 'border-slate-400 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {item.numero}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {item.status_display}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Término: {item.data_termino ? new Date(item.data_termino).toLocaleDateString('pt-BR') : 'Indeterminado'}
                              {item.em_carencia && ' • Carência Vigente 🟢'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">Saldo Disponível</span>
                          <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                            +{parseFloat(item.saldo).toFixed(2)}h
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quantidade a Migrar */}
              {contratoOrigem && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-200">
                      2. Quantidade de Horas a Migrar
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetPercent(100)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition cursor-pointer"
                      >
                        Total (100%)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPercent(50)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition cursor-pointer"
                      >
                        50%
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={saldoOrigemNum}
                      value={quantidade}
                      onChange={(e) => {
                        setQuantidade(e.target.value)
                        if (error) setError(null)
                      }}
                      className="w-full text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 pl-3.5 pr-12 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      horas
                    </span>
                  </div>

                  {/* Projeção de Saldos */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Origem ({contratoOrigem.numero})
                      </span>
                      <span className="font-mono text-sm font-bold text-amber-300">
                        {saldoOrigemRestante.toFixed(2)}h{' '}
                        <span className="text-[10px] text-slate-400">restantes</span>
                      </span>
                    </div>

                    <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0" />

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Novo Saldo Destino
                      </span>
                      <span className="font-mono text-base font-black text-emerald-400">
                        {saldoDestinoProjetado.toFixed(2)}h
                      </span>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                      3. Justificativa / Motivo da Operação
                    </label>
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ex: Aproveitamento de saldo remanescente do contrato..."
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={migrarMutation.isPending || !origemSelecionadaId || qtdMigrarNum <= 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {migrarMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando Migração...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Confirmar e Migrar Saldo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
