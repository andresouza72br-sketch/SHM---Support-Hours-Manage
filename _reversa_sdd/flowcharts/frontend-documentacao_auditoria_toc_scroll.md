# Fluxograma de Função: Índice Flutuante Fixo Centralizado e Scroll Suave

> Módulo: `frontend`  
> Componentes: `DocumentacaoAuditoriaPage.tsx` + `DocumentacaoSidebarTOC.tsx`  
> Comportamento: Posicionamento vertical viewport-centered e deslocamento amortecido  

```mermaid
flowchart TD
    Mount([Montagem do Componente]) --> Measure[Medir Altura do Card TOC: height = containerRef.offsetHeight]
    Measure --> CalcTop["Calcular Offset: topOffset = max(5rem, calc(50vh - height/2))"]
    CalcTop --> StickyApply["Aplicar style top: topOffset e sticky z-20"]
    StickyApply --> UserAction{Ação do Usuário}
    
    UserAction -- Rola a Página Livremente --> ScrollSpy[handleScroll ativo]
    ScrollSpy --> DetectSec[Detectar Seção Visível pelo getBoundingClientRect]
    DetectSec --> Highlight[Atualizar topicoAtivo no Índice]
    
    UserAction -- Clica em Tópico do Índice --> ManualTrigger[isManualScrollRef = true]
    ManualTrigger --> CalcTarget["Calcular Target: el.getBoundingClientRect().top + pageYOffset - 84px"]
    CalcTarget --> SmoothScroll["window.scrollTo com behavior: smooth"]
    SmoothScroll --> Arrive[Conclusão do Deslocamento em 800ms]
    Arrive --> ReleaseLock[isManualScrollRef = false]
    ReleaseLock --> Highlight
```
