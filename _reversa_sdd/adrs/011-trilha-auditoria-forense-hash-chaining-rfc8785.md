# ADR 011: Trilha de Auditoria Forense com Hash Chaining (RFC 8785 / SHA-256) e Gatilhos Nativos de Imutabilidade

## Status
Aceito e Implementado (Feature 005) 🟢

## Contexto
Em contratos de franquia de suporte técnico por horas, disputas e litígios judiciais costumam envolver contestações sobre a veracidade, momento e autoria de autorizações, débitos de saldo e uploads contratuais. Relatórios estáticos gerados sob demanda (PDFs ou consultas SQL convencionais) carecem de força probatória independente perante a justiça, sendo suscetíveis a alegações de alteração retroativa ou fraude no banco de dados.

## Decisão
Implementar uma trilha de auditoria forense baseada em encadeamento criptográfico monotônico (*hash chaining*):
1. **Canonicalização Determinística (RFC 8785 / JCS):** A carga útil de cada evento é convertida em JSON sem espaços, com chaves ordenadas lexicograficamente e tipos estritos para garantir hashes idênticos independentemente de linguagem ou plataforma.
2. **Encadeamento SHA-256:** Cada evento calcula seu hash incorporando o hash do bloco anterior (`previous_hash`), criando uma cadeia contínua indelével por partição contratual.
3. **Imutabilidade Estrita no PostgreSQL:** Criação de gatilho nativo (`trg_forensic_audit_immutability`) que impede comandos `UPDATE` e `DELETE` no banco de dados, complementado por guardas no QuerySet do Django ORM.
4. **Selo Noturno Diário (`AuditDailySeal`):** Fechamento diário consolidando o digest final de cada partição às 23:59:59.
5. **Enquadramento Legal:** Conformidade com a Cadeia de Custódia de Vestígios Digitais do Código de Processo Penal (CPP arts. 158-A a 158-F) e presunção de autenticidade (CPC 411/422).

## Consequências
- **Positivas:** Prova material matemática incontestável em litígios; soberania pericial sem dependência de terceiros ou confiança cega no operador do sistema.
- **Trade-offs:** Exigência de locks pessimistas por partição durante a gravação para manter a monotonicidade sequencial estrita.
