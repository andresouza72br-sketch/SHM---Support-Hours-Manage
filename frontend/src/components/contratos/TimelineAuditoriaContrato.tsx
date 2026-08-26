import {
  FileText,
  Download,
  Upload,
  Trash2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Clock,
  User as UserIcon,
  Globe,
  FileEdit,
  Printer,
  Fingerprint,
} from 'lucide-react'
import type { ContratoAuditLog } from '../../types'

interface TimelineAuditoriaContratoProps {
  logs: ContratoAuditLog[]
  isLoading?: boolean
}

function getEventIcon(tipo: string) {
  switch (tipo) {
    case 'criacao':
      return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
    case 'aceite':
      return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'upload_documento':
      return <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
    case 'download_documento':
      return <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    case 'download_relatorio':
      return <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
    case 'exclusao_documento':
      return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case 'atualizacao_emails':
      return <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
    case 'conclusao':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'cancelamento':
      return <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case 'alteracao':
      return <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    default:
      return <Clock className="w-4 h-4 text-slate-500" />
  }
}

function getEventBadgeColor(tipo: string) {
  switch (tipo) {
    case 'criacao':
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    case 'aceite':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'upload_documento':
      return 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    case 'download_documento':
      return 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    case 'download_relatorio':
      return 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'exclusao_documento':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    case 'atualizacao_emails':
      return 'bg-violet-50 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    case 'conclusao':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'cancelamento':
      return 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

export function TimelineAuditoriaContrato({ logs = [], isLoading = false }: TimelineAuditoriaContratoProps) {
  if (isLoading) {
    return <div className="p-6 text-center text-xs text-slate-500 italic">Carregando trilha de auditoria...</div>
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        Nenhum registro de auditoria disponível para este contrato.
      </div>
    )
  }

  return (
    <div className="max-h-[385px] overflow-y-auto pr-3 pl-6 space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
      {logs.map((log) => {
        const icon = getEventIcon(log.tipo_evento)
        const badgeColor = getEventBadgeColor(log.tipo_evento)
        const dataObj = new Date(log.timestamp)
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div key={log.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1.5 ${badgeColor}`}>
                    {icon}
                    <span>{log.tipo_evento_display}</span>
                  </span>
                  {log.documento_nome && (
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {log.documento_nome}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {dataFormatada}
                </span>
              </div>

              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-2">
                {log.descricao}
              </p>

              {/* Se houver justificativa (Cancelamento / Decisão) */}
              {log.justificativa && (
                <div className="mt-2 p-3 bg-rose-50/80 dark:bg-rose-950/40 border-l-4 border-rose-600 rounded-r-xl text-xs text-rose-900 dark:text-rose-200">
                  <span className="font-black text-[11px] block uppercase tracking-wider mb-0.5">Justificativa Formal:</span>
                  <p className="italic">{log.justificativa}</p>
                </div>
              )}

              {/* Metadados Forenses (Usuário, IP) */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-bold">
                  <UserIcon className="w-3 h-3 text-slate-400" />
                  <span>{log.usuario_nome || 'Sistema'}</span>
                  {log.usuario_role && <span className="font-normal">({log.usuario_role})</span>}
                </span>

                {log.ip_origem && (
                  <span className="flex items-center gap-1 font-mono">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>IP: {log.ip_origem}</span>
                  </span>
                )}

                {log.documento_hash && (
                  <span
                    className="flex items-center gap-1 font-mono text-[9px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                    title={`SHA-256: ${log.documento_hash}`}
                  >
                    <Fingerprint className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>
                      SHA-256: {log.documento_hash.substring(0, 8)}...{log.documento_hash.substring(log.documento_hash.length - 8)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
