# ADR 007: Compensação de Débitos Técnicos e Resgate Atômico de Saldo Contratual

## Status
Aprovado / Implementado (v2.5.0)

## Contexto
Durante o ciclo de vida dos contratos de suporte técnico, clientes podem acumular saldos devedores (overuse com aceites extraordinários) ou saldos positivos remanescentes em contratos já encerrados. No momento da abertura de um novo contrato, é necessário fornecer um mecanismo automatizado e seguro de encontro de contas e aproveitamento de saldo, sem criar inconsistências transacionais.

## Decisão
1. **Compensação com Trava de Teto:** Permitir o abatimento de horas da franquia inicial do novo contrato para quitar o débito de contrato anterior do mesmo cliente, com teto máximo travado rigorosamente no valor absoluto da dívida.
2. **Execução Atômica no Backend (@transaction.atomic):** A criação do contrato, o resgate de saldo positivo e o abatimento para quitação de saldo devedor ocorrem em um único bloco transacional atômico no ContratoService.criar_contrato.
3. **Auditoria Forense Dupla & Livro-Razão:** Registro obrigatório em ambos os contratos no HistoricoSaldo (Ledger) e no ContratoAuditLog (com IP, User-Agent, carimbo temporal e justificativa).
4. **Governança de Comunicação:** Disparo de e-mails transacionais com layout rico e notificações in-app para os gestores e administradores envolvidos.

## Consequências
- **Positivas:** Redução a zero de inconsistências de rede/concorrência; transparência absoluta no Extrato Oficial com conciliação matemática visual; conformidade com as diretrizes do Framework Reversa.
- **Auditoria:** Rastreabilidade 100% periciável de ponta a ponta.
