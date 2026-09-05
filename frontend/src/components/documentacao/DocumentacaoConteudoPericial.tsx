import { useState } from 'react'
import { Search, Terminal, Scale, Download, Copy, Check, ShieldAlert, FileCode, CheckCircle } from 'lucide-react'
import { SCRIPT_PYTHON_VERIFICADOR, downloadScriptVerificador } from '../../utils/verificador_script'

export function DocumentacaoConteudoPericial() {
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  const copiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopiadoId(id)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  const comandoCliExemplo = `python manage.py audit_verify_integrity --partition=contrato:12 --verbose`
  const comandoExecucaoOffline = `python verificador_independente.py --arquivo trilha_contrato_12.json --verbose`
  const comandoPipeApi = `curl -s -H "Authorization: Bearer <TOKEN>" "https://shm.empresa.com.br/api/v1/contratos/12/trilha_forense/" | python verificador_independente.py --stdin`

  return (
    <div className="space-y-12">
      {/* 5. PROTOCOLO PERICIAL E VARREDURA POLICIAL */}
      <section id="protocolo-pericial" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            Seção 05 • Técnico Pericial
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Search className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0" />
          Protocolo Pericial e Varredura Policial
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Esta seção fornece a peritos judiciais nomeados, assistentes técnicos de litígios e investigadores de delegacias de repressão a crimes cibernéticos o roteiro para conduzir a <strong>varredura matemática independente</strong> sobre a trilha forense de qualquer contrato sob análise.
        </p>

        {/* Metodologia de Auditoria sem Caixa-Preta */}
        <div className="my-6 p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50">
          <h4 className="text-sm font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Princípio da Inversão da Caixa-Preta
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Um dos maiores vícios de sistemas corporativos em perícias é a alegação de &quot;segredo de software&quot;, obrigando o perito a confiar em relatórios estáticos em PDF. No SHM, <strong>o perito não precisa confiar no software nem na declaração do operador</strong>: os dados brutos da cadeia podem ser extraídos e validados matematicamente em qualquer computador independente.
          </p>
        </div>

        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide mt-6 mb-3">
          Etapas do Procedimento Pericial de Varredura
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                Extração dos Dados Brutos da Cadeia
              </span>
              <span className="text-[11px] font-mono text-slate-400">Endpoint REST / JSON</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              A autoridade pericial pode exportar a trilha do contrato via API através do endpoint <code className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">GET /api/v1/contratos/{'{id}'}/trilha_forense/</code> ou consultar diretamente a tabela <code className="font-mono font-bold">contratos_forensicauditlog</code> caso tenha acesso a um dump forense do banco de dados PostgreSQL.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                Varredura Automatizada no Servidor via CLI
              </span>
              <span className="text-[11px] font-mono text-slate-400">Django Management Command</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-3">
              Em auditorias in loco no servidor da aplicação, o comando oficial de gerenciamento realiza a checagem em nível de banco:
            </p>
            <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 flex items-center justify-between">
              <code>{comandoCliExemplo}</code>
              <button
                onClick={() => copiarTexto('cli', comandoCliExemplo)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer ml-3 shrink-0"
              >
                {copiadoId === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoId === 'cli' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                Conferência de Integridade do Selo Diário (AuditDailySeal)
              </span>
              <span className="text-[11px] font-mono text-slate-400">Consolidação Noturna</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              O perito deve comparar o <code className="font-mono">ultimo_hash</code> da partição com o registro da tabela <code className="font-mono">contratos_auditdailyseal</code> correspondente. O campo <code className="font-mono">selo_digest</code> atesta que o estado da cadeia estava imutável na data de referência.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 6. SCRIPT AUTOCONTIDO OFFLINE */}
      <section id="script-autocontido" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            Seção 06 • Técnico Pericial
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Terminal className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0" />
          Script Autocontido para Perícia Offline (Air-Gapped)
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Para garantir a soberania pericial e assegurar que a conferência de evidências possa ocorrer em <strong>estações de trabalho periciais totalmente isoladas de redes externas</strong> (em cumprimento à norma ISO/IEC 27037 e ao art. 158-B do CPP), disponibilizamos o código-fonte integral de um utilitário em Python 3 puro, sem qualquer dependência de pacotes externos (pip):
        </p>

        {/* Banner de Download do Script */}
        <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-black tracking-wider uppercase mb-2 border border-purple-400/30">
              <FileCode className="w-3.5 h-3.5" />
              Python 3 Autocontido • Zero Dependências
            </div>
            <h3 className="text-lg font-black tracking-tight">
              Utilitário Pericial: verificador_independente.py
            </h3>
            <p className="text-xs text-purple-200 mt-1 max-w-xl leading-relaxed">
              Implementa o algoritmo determinístico RFC 8785 e validação de hash chaining SHA-256 com diagnóstico de quebra e relatório pericial completo.
            </p>
          </div>

          <button
            onClick={() => downloadScriptVerificador()}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-slate-900 font-extrabold text-xs transition duration-150 shadow-md flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Baixar Script (.py)</span>
          </button>
        </div>

        {/* Bloco de Código com Cópia Rápida */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 shadow-md">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-slate-300">verificador_independente.py</span>
            </div>
            <button
              onClick={() => copiarTexto('script', SCRIPT_PYTHON_VERIFICADOR)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
            >
              {copiadoId === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiadoId === 'script' ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-4 font-mono text-xs text-slate-200">
            <pre className="whitespace-pre">
              <code>{SCRIPT_PYTHON_VERIFICADOR}</code>
            </pre>
          </div>
        </div>

        {/* Instruções de Execução */}
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Exemplos de Linha de Comando do Verificador Independente:
          </h4>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Validação via Arquivo JSON:</span>
              <code>{comandoExecucaoOffline}</code>
            </div>
            <button
              onClick={() => copiarTexto('execOffline', comandoExecucaoOffline)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              {copiadoId === 'execOffline' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Validação via Pipe Direto da API:</span>
              <code>{comandoPipeApi}</code>
            </div>
            <button
              onClick={() => copiarTexto('execPipe', comandoPipeApi)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              {copiadoId === 'execPipe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 7. LEGISLAÇÃO, CERTIFICAÇÕES E NORMAS */}
      <section id="legislacao-certificacoes" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            Seção 07 • Técnico Pericial
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Scale className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0" />
          Enquadramento Jurídico, Certificações e Normas
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          A arquitetura de auditoria do SHM não é apenas uma escolha técnica de desenvolvimento: é uma estrutura rigorosamente orientada a conferir <strong>eficácia probatória irrefutável perante o Poder Judiciário e órgãos de persecução penal</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Código de Processo Penal (CPP), Arts. 158-A a 158-F
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Introduzida pela Lei 13.964/2019 (Pacote Anticrime), a disciplina da <strong>Cadeia de Custódia</strong> exige comprovação da inalterabilidade do vestígio desde a sua fixação até o processamento pericial. O encadeamento SHA-256 particionado atua como o lacre lógico inviolável do evento transacional.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Código de Processo Civil (CPC), Arts. 411 e 422
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              O Art. 411, II reconhece a força probante do documento eletrônico cuja integridade for atestada por meio lógico idôneo. Já o Art. 422 dispõe que reproduções mecânicas ou eletrônicas fazem a mesma prova dos originais, invertendo o ônus de prova contra impugnações meramente protelatórias.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                ISO/IEC 27037:2012 (Evidência Digital)
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              A norma internacional da ISO/IEC estabelece diretrizes para identificação, coleta, aquisição e preservação de prova digital. O SHM atende aos quatro princípios fundamentais: <em>Relevância</em>, <em>Confiabilidade</em>, <em>Suficiência</em> e <em>Auditabilidade Reprodutível</em>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                RFC 8785 (JSON JCS) e RFC 4998/6283 (ERS)
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Padrões abertos da Internet Engineering Task Force (IETF) que definem regras universais para canonicidade de dados e registros sintáticos de evidência perene a longo prazo, assegurando total interoperabilidade sem dependência de plataformas proprietárias.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
