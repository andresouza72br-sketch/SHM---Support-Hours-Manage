# Adendo de Convergência SDD — Feature 006: Página de Documentação da Auditoria Forense

> **Identificador:** `006-doc-auditoria-forense`  
> **Data:** `2026-09-04`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-04.
Superado pela re-extração de 2026-09-04.

## Resumo da entrega

Implementada a Página de Documentação da Auditoria Forense no frontend do SHM, estruturada em dois níveis de profundidade: uma camada institucional didática voltada para clientes e gestores (defendendo a governança do saldo de horas, o débito exclusivo no aceite e a proteção mútua bilateral), e uma camada pericial aprofundada voltada para auditores, peritos forenses judiciais e investigadores policiais de crimes cibernéticos (expondo a canonicidade RFC 8785, encadeamento SHA-256, comandos CLI e script Python autocontido para download). O acesso foi integrado de forma universal ao menu suspenso do perfil do usuário em `Header.tsx` e disponibilizado simultaneamente em rota pública deslogada aberta em `App.tsx` (`/publico/auditoria-forense`), com índice lateral interativo (*Scrollspy*), design editorial refinado (Impeccable UI) e folha de estilos para impressão de laudos periciais (`@media print`).

Total de 11 ações atômicas concluídas com sucesso (T001 a T011) ao longo de 5 fases, com 137/137 testes passando no `pytest` (zero regressões no legado) e compilação do frontend validada sem erros no `npm run build`.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `frontend` | `componente-novo` | Criação de `DocumentacaoAuditoriaPage.tsx`, `DocumentacaoSidebarTOC.tsx`, `DocumentacaoConteudoGeral.tsx` e `DocumentacaoConteudoPericial.tsx`. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-novo` | Módulo `verificador_script.ts` encapsulando a rotina em Python puro (RFC 8785 + SHA-256) e função de download via Blob URL. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-alterado` | `Header.tsx` atualizado com o link "Documentação de Auditoria" acessível a todos os papéis de usuário conectado. |
| `_reversa_sdd/architecture.md` | `frontend` | `delta-de-contrato-externo` | Novas rotas frontend: `/documentacao/auditoria-forense` (autenticada) e `/publico/auditoria-forense` (pública sem login). |
| `_reversa_sdd/domain.md` | `governanca` | `regra-nova` | **RN-14:** Visibilidade e Acesso Universal à Documentação pelo Menu de Usuário e Rota Pública deslogada para autoridades periciais. |
| `_reversa_sdd/domain.md` | `governanca` | `regra-nova` | **RN-15:** Arquitetura de Conteúdo Bimodal (Linguagem Acessível vs Detalhamento Pericial) com navegação assistida por índice temático (*Scrollspy*). |
| `_reversa_sdd/domain.md` | `governanca` | `regra-nova` | **RN-16:** Transparência Metodológica sem Caixa-Preta e Ferramental Autocontido Offline (`verificador_independente.py`) para estações isoladas (*air-gapped*). |
| `_reversa_sdd/domain.md` | `governanca` | `regra-nova` | **RN-17:** Fundamentação Jurídica e Normativa da Cadeia de Custódia Digital (CPP Arts. 158-A a 158-F, CPC 411/422, Marco Civil e ISO/IEC 27037). |

## Regras sob vigilância

- `W001`: Acesso à documentação pelo menu suspenso de usuário e rota pública deslogada (`/publico/auditoria-forense`). Ver `_reversa_forward/006-doc-auditoria-forense/regression-watch.md`.
- `W002`: Estrutura unificada com índice lateral e badges identificando o nível de profundidade (*"Visão Geral"* e *"Técnico Pericial"*). Ver `_reversa_forward/006-doc-auditoria-forense/regression-watch.md`.
- `W003`: Disponibilização de utilitário Python autocontido sem dependências (`verificador_independente.py`) para perícia offline via download. Ver `_reversa_forward/006-doc-auditoria-forense/regression-watch.md`.
- `W004`: Preservação da fundamentação jurídica formal (CPP 158-A a F, CPC 411/422, ISO/IEC 27037). Ver `_reversa_forward/006-doc-auditoria-forense/regression-watch.md`.

## Fontes

- `_reversa_forward/006-doc-auditoria-forense/requirements.md`
- `_reversa_forward/006-doc-auditoria-forense/roadmap.md`
- `_reversa_forward/006-doc-auditoria-forense/legacy-impact.md`
- `_reversa_forward/006-doc-auditoria-forense/regression-watch.md`
- `_reversa_forward/006-doc-auditoria-forense/actions.md`
- `_reversa_forward/006-doc-auditoria-forense/progress.jsonl`
