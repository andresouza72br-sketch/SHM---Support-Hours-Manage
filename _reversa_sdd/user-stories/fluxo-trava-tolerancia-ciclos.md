# User Story: Trava de Tolerância (+30%) na Homologação de Ciclos

**Como** Gestor do Cliente e Técnico da Empresa,  
**Quero** que desvios superiores a 30% em relação ao orçamento orçado exijam justificativa prévia e sejam evidenciados na homologação,  
**Para que** não ocorram surpresas no consumo do banco de horas nem débitos imprevistos.

### Cenário 1: Ciclo dentro da margem de 30%
- **Dado** um ciclo com orçamento aprovado de 10.00h e execução real de 12.00h (+20%),
- **Quando** o técnico solicita o aceite do cliente,
- **Então** o sistema permite a emissão direta do Magic Link sem bloqueios.

### Cenário 2: Ciclo excedendo a margem de 30%
- **Dado** um ciclo com orçamento aprovado de 10.00h e execução real de 15.00h (+50%),
- **Quando** o técnico tenta solicitar o aceite sem justificativa,
- **Então** o sistema bloqueia a submissão exigindo a justificativa do excedente,
- **E** ao ser preenchida, o alerta é registrado na timeline e exibido com destaque visual para o cliente.
