# Evidência de Equivalência e Preservação de Comportamento - OPP-20260829-cm2a

## 1. Integridade Transacional e Garantia ACID

- Encapsulamento de criação de `Tarefa` e vínculo com `Comentario.tarefa_convertida` em bloco atômico `with transaction.atomic():`.
- Eliminação do risco de tarefas órfãs caso ocorram falhas durante a vinculação ou em signals posteriores.

## 2. Preservação Comportamental

- Respostas HTTP 200 OK e 400 Bad Request idênticas.
- Permissões restritas à empresa (`IsEmpresaUser`) mantidas com cobertura de teste 100% verde.
