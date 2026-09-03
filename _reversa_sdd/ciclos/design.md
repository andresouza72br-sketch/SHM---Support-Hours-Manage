# Design do Módulo Ciclos

## 1. Modelos
- `Ciclo`: pedido (FK), tipo, operador (FK), status, horas_estimadas, horas_realizadas, token_acesso, aceito_em, aceito_por.
- `CicloMagicLink`: ciclo (FK), tipo_acao, token, expira_em, usado.
- `AvaliacaoCiclo`: ciclo (1:1), avaliador (FK), nota (1-5), comentario.

## 2. Serviços
- `CicloService.apresentar_orcamento()`: Transiciona para `aguardando_aprovacao` e emite Magic Link.
- `CicloService.aprovar_orcamento()`: Transiciona para `aprovado` (sem débito).
- `CicloService.aceitar_ciclo()`: Transiciona para `aceito`, invoca `SaldoService.consumir(horas_realizadas)` e dispara avaliação.
