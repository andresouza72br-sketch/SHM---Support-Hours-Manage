# ADR 008: Trava de Tolerância de +30% de Horas em Ciclos Técnicos

## Status
Aprovado / Implementado (v2.5.0)

## Contexto
Em contratos sob regime de banco de horas com orçamentação atômica prévia, desvios excessivos entre as horas estimadas e as horas reais executadas geravam desgastes comerciais no momento do aceite formal e surpresas na fatura do cliente.

## Decisão
1. **Margem de Tolerância Fixada em +30%:** O sistema calcula automaticamente `limite = round(horas_estimadas * 1.30, 2)`.
2. **Intercepção Obrigatória na Submissão:** Se `horas_realizadas > limite`, o técnico não pode submeter o ciclo para aceite sem antes fornecer uma justificativa técnica detalhada (`justificativa_excedente`).
3. **Auditoria e Notificação Preventiva:** Ao submeter com estouro de tolerância, o sistema grava evento de alerta na timeline do chamado e despacha aviso prioritário para o gestor responsável.
4. **Transparência na Interface Pública:** O Magic Link e a tela de aceite exibem em destaque as horas orçadas, as horas excedentes e a justificativa fornecida.

## Alternativas Consideradas
- **Bloqueio rígido impedindo aceite:** Rejeitado, pois impediria a entrega de demandas emergenciais legítimas aprovadas verbalmente.
- **Cobrança automática somente do valor orçado:** Rejeitado, pois desconsideraria custos reais autorizados de expansão de escopo.

## Consequências
- **Positivas:** Previsibilidade financeira para o tomador, diminuição drástica de contestações de aceite e documentação formal do motivo de desvios.
- **Negativas:** Exige preenchimento de justificativa pelo técnico em casos de estouro de horas.
