# Relatório da Rede de Segurança - OPP-20260829-cm3o

- **Contexto:** `comunicacao`
- **Alvo:** `backend/apps/comunicacao/serializers.py`
- **Data da Execução:** 2026-08-29
- **Resultado:** 🟢 6/6 testes aprovados (100% verde)

### Suíte Executada

```
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_todos_usuarios_podem_comentar PASSED
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_apenas_o_dono_pode_editar_seu_comentario PASSED
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_apenas_o_dono_pode_excluir_seu_comentario PASSED
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_qualquer_comentario_notifica_todos_empresa_e_cliente PASSED
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_aprovacoes_e_aceites_notificam_todos_menos_autor PASSED
backend/tests/test_comentarios_e_permissoes.py::TestComentariosEPermissoes::test_email_orcamento_e_aceite_apenas_para_gerente_cliente PASSED
```
