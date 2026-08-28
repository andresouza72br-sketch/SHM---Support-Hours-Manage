# Adendo de Convergência SDD — Feature 001: Trava de Tolerância de 30% no Aceite de Ciclos

> **Feature ID:** `001-trava-tolerancia-ciclos`  
> **Data de Homologação:** 2026-08-27  
> **Status:** `Vigente` 🟢

---

## 1. Resumo da Entrega
Implementada a regra de negócio que restringe a concessão de aceite formal de ciclos técnicos em no máximo **30% de acréscimo** sobre o orçamento aprovado (`horas_estimadas`).

## 2. Alterações Realizadas
- **Backend:**
  - Em [`backend/apps/ciclos/services.py`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/backend/apps/ciclos/services.py), método `CicloService.aceitar_ciclo()`, incluída checagem de teto:
    `limite_tolerancia = horas_estimadas * Decimal('1.30')`.
    Lança `ValidationError` caso `horas_realizadas > limite_tolerancia`.
  - Em [`backend/tests/test_workflow_e_ciclos.py`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/backend/tests/test_workflow_e_ciclos.py), adicionados testes `test_aceite_ciclo_dentro_da_tolerancia_30_porcento` e `test_aceite_ciclo_acima_da_tolerancia_30_porcento_bloqueado`.
- **Frontend:**
  - Em [`frontend/src/components/ciclos/CicloCarousel.tsx`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/frontend/src/components/ciclos/CicloCarousel.tsx), adicionados badges de status e cores de alerta para ciclos com horas excedentes (âmbar até +30%, vermelho para excesso >30%).

## 3. Cobertura de Testes
- **Testes Automatizados:** 64/64 testes passando (`pytest` no backend).
- **Frontend Build:** `npm run build` executado com sucesso e zero erros de tipagem TypeScript.
