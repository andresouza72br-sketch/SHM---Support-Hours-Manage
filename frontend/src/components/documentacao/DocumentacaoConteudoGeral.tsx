import { useState } from 'react'
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Copy, Check, Sparkles, FileText } from 'lucide-react'

export function DocumentacaoConteudoGeral() {
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  const copiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopiadoId(id)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  const payloadExemploBruto = `{
  "horas_realizadas": 12.5,
  "saldo_anterior": 40.0,
  "ciclo_id": 45,
  "saldo_resultante": 27.5
}`

  const payloadExemploCanonico = `{"ciclo_id":45,"horas_realizadas":"12.50","saldo_anterior":"40.00","saldo_resultante":"27.50"}`

  return (
    <div className="space-y-12">
      {/* 1. FUNDAMENTOS E DEFESA DO SHM */}
      <section id="fundamentos-shm" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Seção 01 • Visão Geral & Negócio
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          Fundamentos e a Defesa da Auditoria no SHM
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Em modelos tradicionais de contratação de suporte por franquia de horas, o principal ponto de atrito entre fornecedores e contratantes sempre foi a <strong>opacidade na prestação de contas</strong>. Dúvidas frequentes sobre quem autorizou determinado atendimento, quantas horas foram efetivamente consumidas e se os lançamentos no extrato foram alterados retroativamente costumam desgastar a relação comercial e gerar litígios jurídicos custosos.
        </p>

        <div className="my-6 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50">
          <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            O Princípio da Proteção Mútua Bilateral
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            O SHM foi projetado com uma premissa clara: <strong>auditoria estrita não é burocracia, é garantia patrimonial mútua</strong>. A arquitetura protege o cliente contra débitos unilaterais ou cobranças inflacionadas, e protege a equipe prestadora contra contestações indevidas após homologações formais. No SHM, <em>o código e a matemática são o árbitro imparcial do contrato</em>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-sm mb-3">
              01
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Débito no Aceite Formal
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              A estimativa do chamado não desconta horas. O débito ocorre única e exclusivamente no momento em que o tomador homologa a entrega pelo portal ou Magic Link seguro.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-sm mb-3">
              02
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Trava de Tolerância (+30%)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Horas realizadas que excedam em mais de 30% a estimativa aprovada são travadas automaticamente pelo sistema, exigindo justificativa obrigatória e alerta visual destacado.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center font-black text-sm mb-3">
              03
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Livro-Razão Imutável
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Todos os registros financeiros de saldo são do tipo <em>append-only</em>. Erros jamais são apagados: correções exigem lançamento explícito de estorno auditado.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 2. WORKFLOW OPERACIONAL */}
      <section id="workflow-auditoria" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Seção 02 • Visão Geral & Negócio
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          O Workflow da Trilha Forense em 7 Passos
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Cada evento relevante no ciclo de vida do suporte percorre uma cadeia transacional estrita antes de ser gravado de forma perene no banco de dados:
        </p>

        <div className="mt-6 space-y-3">
          {[
            {
              passo: '1',
              titulo: 'Ação Transacional Disparada',
              desc: 'Um usuário autoriza um aceite de ciclo, solicita migração de saldo entre contratos ou reabastece a franquia.',
            },
            {
              passo: '2',
              titulo: 'Aquisição de Lock Pessimista por Partição',
              desc: 'O sistema adquire lock exclusivo (select_for_update) na partição (ex: contrato:12), prevenindo que duas transações simultâneas gerem bifurcações no encadeamento.',
            },
            {
              passo: '3',
              titulo: 'Leitura do Último Hash da Cadeia',
              desc: 'O elo anterior é recuperado. Caso seja a primeira transação da partição, o sistema utiliza o bloco gênese padronizado de 64 zeros hexadecimais.',
            },
            {
              passo: '4',
              titulo: 'Normalização Canônica RFC 8785',
              desc: 'Os dados do evento (payload) são serializados deterministicamente com ordenação recursiva de chaves, formatação decimal fixa e supressão de espaços.',
            },
            {
              passo: '5',
              titulo: 'Cálculo de Dispersão SHA-256',
              desc: 'O novo hash é gerado pela concatenação: SHA-256(previous_hash || payload_canonico). Qualquer byte alterado no payload geraria um hash completamente distinto.',
            },
            {
              passo: '6',
              titulo: 'Gravação Atômica e Trava Nativa no PostgreSQL',
              desc: 'O registro é gravado em ForensicAuditLog e espelhado reflexamente na trilha de auditoria do contrato. O gatilho nativo do banco assegura que UPDATE ou DELETE sejam rejeitados.',
            },
            {
              passo: '7',
              titulo: 'Lavratura do Selo Diário Noturno',
              desc: 'À meia-noite, uma rotina consolidada (AuditDailySeal) sintetiza as movimentações do dia e gera um marco pericial diário com carimbo de tempo indelével.',
            },
          ].map((item) => (
            <div
              key={item.passo}
              className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                {item.passo}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {item.titulo}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 3. TECNOLOGIAS E IMUTABILIDADE */}
      <section id="tecnologias-imutabilidade" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Seção 03 • Visão Geral & Negócio
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Lock className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          Tecnologias de Garantia da Imutabilidade
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Diferente de sistemas que apenas armazenam logs em arquivos de texto sujeitos a edições acidentais ou deliberadas, o SHM emprega tecnologia de integridade matemática baseada em padrões globais de segurança:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-xs">RFC 8785</span>
              Canonicidade Determinística
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Elimina variações entre interpretadores. Em sistemas comuns, campos JSON ordenados de forma diferente ou com formatações decimais variadas geram hashes distintos para o mesmo dado. A norma RFC 8785 resolve isso tornando a serialização 100% reproduzível por qualquer perito em qualquer linguagem de programação.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-xs">SHA-256</span>
              Criptografia de Encadeamento
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Cada elo contém o resumo criptográfico do elo anterior. Para alterar um registro realizado há três meses, seria necessário reescrever todos os registros posteriores até a data de hoje, o que quebraria a validação do selo diário e seria detectado de imediato pelo verificador independente.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono text-xs">PostgreSQL</span>
              Gatilhos Nativo Anti-Mutação
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              O gatilho <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">trg_forensic_audit_immutable</code> intercepta qualquer comando SQL <code className="font-mono">UPDATE</code> ou <code className="font-mono">DELETE</code> diretamente no motor do PostgreSQL. Mesmo se um administrador com acesso root ao servidor tentar alterar a tabela, a instrução é bloqueada com erro irrecuperável.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-xs">RN-12</span>
              Justificativa Mandatória Nível 1
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Operações de impacto severo (como exclusão de contratos, cancelamentos de aceites ou compensações) exigem obrigatoriamente um campo de justificativa técnica com no mínimo 10 caracteres válidos não-vazios, que se torna parte inseparável da prova forense perene.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 4. EXEMPLOS PRÁTICOS */}
      <section id="exemplos-praticos" className="scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Seção 04 • Visão Geral & Negócio
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          Exemplos Práticos: Payload e Detecção de Fraude
        </h2>

        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-base">
          Veja abaixo como o SHM transforma dados de uma transação real de débito em uma prova criptográfica matemática:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          {/* JSON Bruto */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 text-white font-mono text-xs">
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <span className="text-slate-300 font-bold">1. Payload Bruto (Antes da Normalização)</span>
              <button
                onClick={() => copiarTexto('bruto', payloadExemploBruto)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiadoId === 'bruto' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoId === 'bruto' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-amber-300">
              <code>{payloadExemploBruto}</code>
            </pre>
          </div>

          {/* JSON Canônico RFC 8785 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 text-white font-mono text-xs">
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <span className="text-emerald-400 font-bold">2. Payload Canônico RFC 8785 (Normalizado)</span>
              <button
                onClick={() => copiarTexto('canonico', payloadExemploCanonico)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiadoId === 'canonico' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoId === 'canonico' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-emerald-300 break-all whitespace-pre-wrap">
              <code>{payloadExemploCanonico}</code>
            </pre>
          </div>
        </div>

        {/* Demonstração de Quebra */}
        <div className="mt-6 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
          <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Simulação de Detecção de Adulteração (Broken Chain)
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Se alguém alterasse o valor de <code className="font-bold">horas_realizadas</code> de <code className="font-bold">"12.50"</code> para <code className="font-bold">"12.51"</code>, o hash do nó se transformaria por completo. Como o nó seguinte guarda o hash original em seu campo <code className="font-bold font-mono">previous_hash</code>, a conferência matemática apontará imediatamente a discrepância no exato elo da fraude, sem qualquer dúvida pericial.
          </p>
        </div>
      </section>
    </div>
  )
}
