# Evidência de Desacoplamento e Topologia - OPP-20260828-m8pc

> Contexto: `saldo`  
> Verbo: `decouple`  
> Método de Preservação: `tests` (Equivalência funcional e isolamento de domínio)

---

## 1. Métricas de Topologia de Dependências

| Métrica | Antes | Depois | Redução |
|---|---|---|---|
| **Classes Externas Acopladas em SaldoService** | 6 classes | **1 classe** (`ContratoService`) | **-83% Acoplamento Eferente** |
| **Módulos Acoplados Diretamente a SaldoService** | 3 módulos (`contratos`, `notificacoes`, `accounts`) | **1 módulo** (`contratos`) | **-66% Dependências** |
| **Imports Dinâmicos Locais em Métodos** | 4 blocos de import inline | **0 blocos de import inline** | **100% Eliminados** |
| **Coesão do SaldoService** | Baixa (mistura contábil e mensageria) | Alta (estritamente contábil/ledger) | **Alta Coesão (SRP)** |

---

## 2. Equivalência Funcional Observada

1. **Auditoria Contratual Dupla:** Registros em `ContratoAuditLog` para contratos de origem e destino preservam todas as mensagens, autor, IPs e timestamps.
2. **Disparo de E-mails:** O serviço `ContratoEmailNotificacaoService` continua sendo acionado com os mesmos parâmetros e templates.
3. **Notificações In-App:** Gestores do cliente e administradores do sistema continuam recebendo notificações estruturadas.
4. **Preservação de Testes:** 73/73 testes executados com 100% de sucesso.
