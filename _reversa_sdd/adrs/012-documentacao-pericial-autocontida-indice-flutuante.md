# ADR 012: Página Oficial de Documentação Pericial Autocontida com Índice Flutuante Centralizado e Verificador Independente

## Status
Aceito e Implementado (Feature 006) 🟢

## Contexto
Peritos judiciais, auditores de compliance e assistentes técnicos frequentemente necessitam auditar o sistema sem credenciais corporativas e em estações de trabalho isoladas da internet (*air-gapped*), em consonância com a norma ISO/IEC 27037. Além disso, a leitura de laudos técnicos extensos exige uma interface com excelente usabilidade, índice de navegação sempre acessível e rolagem fluida.

## Decisão
1. **Rota Pública e Protegida:** Disponibilizar `/documentacao/auditoria-forense` (para usuários logados via dashboard) e `/publico/auditoria-forense` (para acesso irrestrito por autoridades e peritos).
2. **Índice Flutuante Fixo Centralizado Verticalmente:** O sumário lateral (`DocumentacaoSidebarTOC`) calcula dinamicamente seu posicionamento (`max(5rem, calc(50vh - halfHeight))`) para flutuar perfeitamente centralizado na viewport durante toda a leitura de 7 seções, acompanhado de coluna `lg:self-stretch`.
3. **Scroll Suave Amortecido:** Deslocamento animado por cálculo de coordenada com compensação exata do cabeçalho fixo (`headerOffset = 84px`) e trava anti-concorrência no Scrollspy (`isManualScrollRef`).
4. **Utilitário Pericial em Python Puro (`verificador_independente.py`):** Distribuição do código-fonte completo diretamente pelo frontend, permitindo download e execução offline com zero dependências externas (`pip`).

## Consequências
- **Positivas:** Atendimento pleno ao princípio da "Inversão da Caixa-Preta" e padrão de craft visual e usabilidade excepcional na leitura de evidências.
- **Trade-offs:** Manutenção do utilitário Python sincronizado caso ocorra evolução do algoritmo de serialização RFC 8785.
