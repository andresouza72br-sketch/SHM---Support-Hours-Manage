# Adendo de Convergência SDD — Feature 004: Anexos de Pedidos, Referência em Ciclos e Anexos em Mensagens

> **Identificador:** `004-anexos-pedidos-ciclos-msgs`  
> **Data:** `2026-09-04`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-04.
Superado pela re-extração de 2026-09-04.

## 1. Resumo da Entrega

Implementada a gestão integral de anexos no SHM, expandindo a colaboração entre clientes e a equipe técnica durante todo o ciclo de vida do chamado:

1. **Abertura de Chamados (Pedidos):**
   - Suporte a upload múltiplo de até 10 arquivos simultâneos via `multipart/form-data`.
   - Validador centralizado em `apps/core/validators.py` impondo limite rígido de 25 MB por anexo.
   - Lista de formatos seguros permitidos abrangendo documentos, imagens, planilhas, arquivos compactados e áudios em formato `.mp3`, com bloqueio absoluto de arquivos executáveis e scripts maliciosos.
   - Área de drag-and-drop interativa em `NovoPedidoPage.tsx` com prévia de arquivos e remoção individual.

2. **Orçamento e Decomposição em Ciclos:**
   - Modelo relacional `ManyToMany` entre `Ciclo` e `AnexoPedido` utilizando tabela intermediária `shm_ciclo_anexos_pedido` (migração `0006_ciclo_anexos_pedido.py`).
   - Usabilidade de arrastar e soltar (*drag-and-drop*) na tela de análise operacional (`AnalisePedidoPage.tsx`), viabilizando a multi-referência (o mesmo anexo pode subsidiar múltiplos ciclos sem replicação física do arquivo em storage).
   - Endpoints dedicados `referenciar_anexo` e `desvincular_anexo` com validação de pertencimento ao mesmo chamado.
   - Preservação do isolamento visual: as referências são operacionais/internas e não poluem o Magic Link público do cliente.

3. **Comunicação em Ciclos (Mensagens e Respostas):**
   - Envio de até 3 arquivos anexos por comentário raiz ou resposta em `CicloCarousel.tsx` e `ComentarioViewSet`.
   - Mini-player nativo para reprodução direta de arquivos de áudio `.mp3` e miniaturas para imagens.
   - Remoção granular de anexos na edição do comentário (`remover_anexo`).
   - Exclusão física em cascata: exclusão do comentário ou do anexo expurga os arquivos correspondentes do storage via signal `post_delete`.

4. **Visualização Centralizada de Documentos:**
   - Novo card dedicado em `DetalhePedidoPage.tsx` exibindo todos os arquivos anexados originalmente pelo cliente, com ícones por extensão, formatação amigável de tamanho e download direto.

Total de 16 ações de ponta a ponta concluídas com sucesso (T001 a T016), com 108/108 testes passando no `pytest` e compilação do frontend validada sem erros no `npm run build`.

## 2. Impacto por Artefato da Extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `apps.core` | `componente-novo` | Novo módulo `validators.py` com validação de tamanho (25 MB), whitelist de extensões (com `.mp3`) e blacklist de executáveis. |
| `_reversa_sdd/architecture.md` | `apps.pedidos` | `delta-de-contrato-externo` | `PedidoViewSet` e `PedidoService` passam a aceitar submissões `multipart/form-data` com até 10 arquivos anexos. |
| `_reversa_sdd/architecture.md` | `apps.ciclos` | `delta-de-dados` | Campo ManyToMany `anexos_pedido` em `Ciclo` viabilizando multi-referência relacional entre chamados e ciclos via tabela `shm_ciclo_anexos_pedido`. |
| `_reversa_sdd/architecture.md` | `apps.comunicacao` | `delta-de-dados` | Suporte a multipart em comentários (até 3 arquivos) e garantia de limpeza em storage via signal `post_delete` em `AnexoComentario`. |
| `_reversa_sdd/domain.md` | `pedidos` | `regra-nova` | **RN-01:** Limite de 10 arquivos por pedido, teto de 25 MB por arquivo e filtro de segurança para extensões aceitas. |
| `_reversa_sdd/domain.md` | `ciclos` | `regra-nova` | **RN-02:** Multi-referência de anexos do pedido em ciclos via drag-and-drop sem replicação física de storage e isolada do Magic Link. |
| `_reversa_sdd/domain.md` | `comunicacao` | `regra-nova` | **RN-03 & RN-04:** Suporte a até 3 anexos em mensagens e respostas (máx 25 MB cada) com exclusão granular permitida ao editar comentário. |
| `_reversa_sdd/domain.md` | `comunicacao` | `regra-alterada` | **RN-05:** Exclusão em cascata de mensagens aciona expurgo físico dos arquivos binários correspondentes do storage em disco. |
| `_reversa_sdd/flowcharts/frontend.md` | `pedidos` | `componente-alterado` | `NovoPedidoPage.tsx` e `DetalhePedidoPage.tsx` integrados com seleção e listagem de anexos com prévias e badges. |
| `_reversa_sdd/flowcharts/frontend.md` | `ciclos` | `componente-alterado` | `AnalisePedidoPage.tsx` com drag-and-drop de referências e `CicloCarousel.tsx` com envio de anexos, player MP3 e remoção na edição. |

## 3. Regras sob Vigilância

- `W001`: Validador centralizado e teto de 25 MB por arquivo (`backend/apps/core/validators.py`) exigindo `client_max_body_size >= 250M` em proxies. Ver `_reversa_forward/004-anexos-pedidos-ciclos-msgs/regression-watch.md`.
- `W002`: Integridade relacional da multi-referência em ciclos e consistência de chamado nas actions `referenciar_anexo` e `desvincular_anexo`. Ver `_reversa_forward/004-anexos-pedidos-ciclos-msgs/regression-watch.md`.
- `W003`: Ciclo de vida e expurgo físico no storage via signal `post_delete` em `AnexoComentario` ao deletar mensagens. Ver `_reversa_forward/004-anexos-pedidos-ciclos-msgs/regression-watch.md`.
- `W004`: Reatividade da interface e sincronização de polling nos detalhes do chamado e execução dos ciclos. Ver `_reversa_forward/004-anexos-pedidos-ciclos-msgs/regression-watch.md`.

## 4. Fontes

- `_reversa_forward/004-anexos-pedidos-ciclos-msgs/requirements.md`
- `_reversa_forward/004-anexos-pedidos-ciclos-msgs/roadmap.md`
- `_reversa_forward/004-anexos-pedidos-ciclos-msgs/legacy-impact.md`
- `_reversa_forward/004-anexos-pedidos-ciclos-msgs/regression-watch.md`
- `_reversa_forward/004-anexos-pedidos-ciclos-msgs/actions.md`
