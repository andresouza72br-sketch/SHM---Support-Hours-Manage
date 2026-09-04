# Adendo de Convergência SDD — Feature 003: Supressão Seletiva de Notificação para o Autor da Ação

> **Identificador:** `003-nao-enviar-para-autor`  
> **Data:** `2026-09-04`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-04.
Superado pela re-extração de 2026-09-04.

## 1. Resumo da Entrega

Implementada a governança declarativa de destinatários de notificações e e-mails no SHM com a opção "Não enviar para o autor (Quem executou a ação)", acompanhada de uma invariante universal estrita para notificações in-app no sininho (o usuário autor logado nunca recebe no sininho notificações geradas por ele mesmo).

A funcionalidade inclui:
- Novo campo booleano `nao_enviar_autor` no modelo `ConfiguracaoNotificacao` com migração aplicada no banco de dados.
- Calibragem de defaults para todos os 22 eventos do sistema: ações operacionais críticas ativas por padrão (`nao_enviar_autor = True`), convites/autenticação/relatórios inativas por padrão (`False`).
- Supressão do autor de `destinatarios_usuarios` e de cópias (`emails_cc`) quando ativo.
- Invariante estrita in-app em `NotificacaoService` e `ContratoService` para todas as ações operacionais.
- Exposição do campo no serializer DRF permitindo leitura e atualização via PATCH por administradores da empresa.
- Checkbox interativo no modal de Matriz de Destinatários na página de Configurações de Notificações e E-mails (`ConfiguracoesNotificacoesPage.tsx`).
- Bateria de testes automatizados completa com 16 testes dedicados e 18 testes de regressão aprovados.

Total de 9 ações concluídas com sucesso (T001 a T009).

## 2. Impacto por Artefato da Extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `apps.notificacoes` | `delta-de-dados` | Adicionada coluna `nao_enviar_autor` no modelo `ConfiguracaoNotificacao` e exposta na API REST `/api/v1/notificacoes/configuracoes-notificacoes/`. |
| `_reversa_sdd/domain.md` | `notificacoes` | `regra-alterada` | Resolução de destinatários em `resolver_destinatarios_evento` passa a expurgar o usuário autor e seu e-mail de `emails_cc` quando `nao_enviar_autor` estiver ativo. |
| `_reversa_sdd/domain.md` | `notificacoes` | `regra-nova` | Invariante universal do sininho: o autor da ação conectado nunca recebe notificações in-app geradas por suas próprias ações, independentemente da configuração de e-mail. |
| `_reversa_sdd/frontend/` | `notificacoes` | `componente-alterado` | Modal da Matriz de Destinatários em `ConfiguracoesNotificacoesPage.tsx` passa a conter o checkbox "Não enviar para o autor (Quem executou a ação)". |

## 3. Regras sob Vigilância

- `W001`: Invariante in-app do sininho (sininho nunca notifica o autor logado). Ver `_reversa_forward/003-nao-enviar-para-autor/regression-watch.md`.
- `W002`: Supressão de destinatários de e-mail e cópia (`emails_cc`) quando `nao_enviar_autor` for `True`. Ver `_reversa_forward/003-nao-enviar-para-autor/regression-watch.md`.
- `W003`: Governança e controle de acesso restrito a administradores da empresa (`IsEmpresaAdmin`). Ver `_reversa_forward/003-nao-enviar-para-autor/regression-watch.md`.
- `W004`: Calibragem de defaults nos 22 eventos mapeados do sistema. Ver `_reversa_forward/003-nao-enviar-para-autor/regression-watch.md`.

## 4. Fontes

- `_reversa_forward/003-nao-enviar-para-autor/requirements.md`
- `_reversa_forward/003-nao-enviar-para-autor/roadmap.md`
- `_reversa_forward/003-nao-enviar-para-autor/legacy-impact.md`
- `_reversa_forward/003-nao-enviar-para-autor/regression-watch.md`
- `_reversa_forward/003-nao-enviar-para-autor/actions.md`
