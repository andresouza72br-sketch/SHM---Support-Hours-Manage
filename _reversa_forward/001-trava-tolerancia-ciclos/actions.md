# Plano de Ações Atômicas — Feature 001: Trava de Tolerância de 30%

| ID | Ação / Tarefa Técnica | Arquivo Alvo | Status |
|---|---|---|:---:|
| **ACT-01** | Adicionar constante de tolerância `FATOR_TOLERANCIA_MAXIMA = Decimal('1.30')` e validação no `CicloService.aceitar_ciclo` | `backend/apps/ciclos/services.py` | [X] |
| **ACT-02** | Garantir retorno amigável com erro 400 e payload estruturado no endpoint de aceite | `backend/apps/ciclos/views.py` | [X] |
| **ACT-03** | Criar casos de teste unitário para validar cenários <=30% (aceito) e >30% (bloqueado) | `backend/tests/test_workflow_e_ciclos.py` | [X] |
| **ACT-04** | Adicionar indicador visual de tolerância no carrossel de ciclos do frontend | `frontend/src/components/ciclos/CicloCarousel.tsx` | [X] |
| **ACT-05** | Executar suíte de testes (`pytest` 64/64 passados e `npm run build` sucesso) | `backend/`, `frontend/` | [X] |
