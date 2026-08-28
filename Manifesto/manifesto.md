---
title: "Guia de Fundamentos: Da Programação por Impulso à Engenharia no SHM"
project: "Support Hours Manager (SHM)"
mentorship: "Prof. Sandeco Macedo"
author: "André Luis de Souza"
framework: "Reversa"
---

# Manifesto: Da Programação por Impulso à Engenharia no SHM

### 1. Prefácio: O Encontro da Experiência com a Inovação

Aos 54 anos, minha trajetória como Engenheiro de Requisitos e Analista de Sistemas formado pelo UniCEUB ensinou-me que a tecnologia é efêmera, mas o rigor é eterno. Ao longo das décadas, vi "balas de prata" surgirem e desaparecerem, mas o encontro com o **Prof. Sandeco Macedo** e o curso de Engenharia de Software com IA trouxe uma clareza definitiva: estamos diante de uma mudança de paradigma. O projeto **SHM (Support Hours Manager)** não é meramente um exercício acadêmico; é a materialização de fundamentos clássicos orquestrados pela Inteligência Artificial.

A história do nosso craft é marcada por ciclos de amadorismo que custam caro. Para não sermos apenas passageiros da "vibe" do momento, precisamos converter a velocidade bruta dos LLMs em progresso sustentável, transformando o entusiasmo inicial em software de alta integridade.

### 2. A Ilusão do "Vibe Coding" e o Ponto de Inversão

O termo **"Vibe Coding"**, cunhado por Andrej Karpathy em 2025, descreve o perigoso estado de "flow" onde o desenvolvedor aceita sugestões de IAs por intuição, sem planejamento ou revisão crítica. Embora a sensação de onipotência seja inebriante, ela mascara a criação de um "software descartável" que carece de espinha dorsal arquitetural.

Abaixo, comparo a volatilidade desse impulso com a solidez da engenharia:


|                      |                                                |                                                      |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Aspecto              | Programação por Impulso (Vibe Coding)          | Engenharia de Software                               |
| **Requisitos**       | Alucinados pela IA ou baseados em suposições.  | Levantados para resolver o problema real do negócio. |
| **Processo**         | Acúmulo caótico de prompts sem rastro técnico. | Abordagem sistemática, disciplinada e quantificável. |
| **Sustentabilidade** | Custo de mudança cresce de forma exponencial.  | Custo de mudança mantém-se linear e previsível.      |
| **Qualidade**        | Funciona por coincidência (protótipo).         | Funciona por design e validação (produto).           |


**O Ponto de Inversão Crítico** A experiência nos ensina que o "juro" do débito técnico não perdoa. Conforme detalhado na documentação técnica, projetos sem processo atingem o **Ponto de Inversão exatamente aos 8.2 meses**. Nesse estágio, a taxa de juros do débito acumulado torna-se impagável: cada nova funcionalidade custa mais do que se o projeto fosse reiniciado do zero com engenharia. O que começou como agilidade transforma-se em paralisia sistêmica.

*Para evitar essa podridão arquitetural, é imperativo resgatar os fundamentos que dão ordem ao caos gerado pela IA.*

### 3. O Resgate dos Fundamentos: SWEBOK e GoF no SHM

A engenharia não reside na digitação, mas no governo do sistema. O **SWEBOK (Software Engineering Body of Knowledge)** é categórico: o código é apenas uma fração do ciclo de vida. A manutenção, por exemplo, consome até **80% do orçamento total** de um software. No SHM, o foco foi deslocado da escrita para a manutenibilidade e gestão de configuração.

Para domar a IA e impedir que ela gere um "macarrão de código", utilizamos os padrões **GoF (Gang of Four)** como **contratos de isolamento**. Eles criam as fronteiras cognitivas necessárias para que os agentes possam raciocinar sobre o código sem estourar janelas de contexto:

- **Strategy:** Define contratos claros para algoritmos de cálculo, permitindo trocas sem impacto no núcleo.
- **Observer:** Estabelece um mecanismo de notificação desacoplado para mudanças de estado.
- **Factory Method:** Centraliza a criação de objetos, impedindo que a lógica de negócio se suje com instanciametos complexos.
- **Repository:** Isola o domínio do acesso a dados, protegendo o sistema contra flutuações de infraestrutura.

A governança do SHM repousa sobre três pilares:

- **Sistemática:** O método precede a ação.
- **Disciplinada:** O rigor é mantido mesmo sob pressão.
- **Quantificável:** O progresso é medido por métricas reais, não por "vibes".

*Essas estruturas clássicas são agora os trilhos por onde correm os nossos novos colaboradores: os agentes inteligentes.*

### 4. A Nova Engenharia: SDD, TDD e o Agent Harness

O **AI Engineer** não escreve código; ele governa processos. No SHM, adotamos o **SDD (Spec-Driven Development)** como a nossa "especificação viva" — um contrato inegociável que dita as regras para a IA.

O ciclo de desenvolvimento é regido pelo rigor do **TDD (Test-Driven Development)** adaptado para agentes:

1. **Red:** O humano define o teste (o contrato de sucesso).
2. **Green:** O agente gera o código estritamente necessário para satisfazer o teste.
3. **Refactor:** Humano e IA limpam a estrutura, garantindo aderência aos padrões arquiteturais.

A peça-chave dessa engrenagem é o **Agent Harness**. Ele não é apenas um prompt, mas um conjunto de *skills* e *hooks* que impõe restrições de domínio, evitando alucinações e transformando uma IA genérica em um arquiteto especializado no contexto do SHM.

"O valor do desenvolvedor não está na velocidade com que digita, mas na lucidez com que julga e governa o sistema."

### 5. A Perspectiva Histórica: Por Que o Processo é Inegociável?

Na aviação, a taxa de acidentes é de apenas **0,07 por milhão de voos** porque o processo é lei. Na medicina, checklists obrigatórios reduzem complicações em **47%**. No software, curiosamente, o mercado ainda chama a negligência de "ser ágil". Essa ironia profissional reflete-se nos dados estagnados do **Chaos Report 2020**: apenas **31%** dos projetos são bem-sucedidos, enquanto **50%** são "desafiados" (atrasos/custos extras) e **19%** falham ou são cancelados antes da entrega.

O custo da ausência de processo é medido em desastres:

1. **Ariane 5 (1996):** Explosão por overflow de inteiro. **O "só o que?":** Falha crítica na validação de requisitos em um novo contexto de reuso.
2. **Therac-25 (1985-1987):** Mortes por radiação excessiva. **O "só o que?":** Substituição de travas físicas por software não validado para condições de borda reais.
3. [**HealthCare.gov](http://HealthCare.gov) (2013):** Colapso total no lançamento. **O "só o que?":** Falha grave nos portões de processo (gate failure) e ausência de testes de integração sob carga real.

*A história prova que o software não é "diferente"; ele apenas carece de responsabilidade formal. O processo não é burocracia; é ética profissional.*

### 6. Conclusão: O Manifesto para o Futuro Sustentável

O **SHM (Support Hours Manager)** prova que a velocidade da IA, quando contida por uma arquitetura sólida e pelo **Framework Reversa**, produz resultados excepcionais. Sob a mentoria do Prof. Sandeco Macedo, aprendi que o futuro não pertence a quem "digita prompts", mas a quem projeta sistemas que duram.

Construir software na era da IA exige o compromisso com estas premissas:

- **A IA é o motor, o Engenheiro é o freio e o leme:** A responsabilidade final pela qualidade é humana e inalienável.
- **Especificação é o novo código:** Sem o rigor do SDD, a velocidade da IA apenas acelera a chegada ao ponto de colapso.
- **Manutenibilidade é a métrica da verdade:** Se o seu sistema não sobrevive à primeira mudança após o deploy, você não fez engenharia, fez artesanato digital.

Deixe para trás o amadorismo do "Vibe Coding". Assuma seu papel como um verdadeiro **AI Engineer**.

**André Luis de Souza** *Engenheiro de Requisitos e Arquiteto de Software* *Sob a luz dos ensinamentos de Sandeco Macedo*