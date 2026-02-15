
# Separar Comparecimento e Proposta em acoes independentes

## Problema atual
Quando o corretor clica em "Registrar Comparecimento" e confirma que o cliente compareceu, o sistema exige o valor da proposta e avanca automaticamente para a etapa "Proposta". Isso nao reflete a realidade, pois o cliente pode ter comparecido (visita, call, reuniao) sem que haja proposta ainda.

## Solucao

Separar em duas acoes distintas:

1. **Confirmar Visita** -- apenas registra que o cliente compareceu, sem pedir valor e sem mudar de etapa
2. **Inserir Proposta** -- novo botao que aparece na etapa "Agendamento" (apos comparecimento confirmado), pede o valor da proposta e avanca para a etapa "Proposta"

## Fluxo revisado

```text
Agendamento
  |
  +-- Registrar Comparecimento (ja existe)
  |     +-- Compareceu --> apenas salva comparecimento=true, SEM mudar status
  |     +-- Nao Compareceu --> oferece reagendar (ja existe)
  |
  +-- Inserir Proposta (NOVO botao, aparece quando comparecimento=true)
        +-- Pede valor da proposta
        +-- Avanca para etapa "Proposta" (docs_received)
```

## Alteracoes tecnicas

### 1. `src/hooks/use-kanban-leads.ts`
- **Nova funcao `registrarComparecimento`**: apenas faz `update` com `comparecimento: true` e registra interacao `comparecimento_registrado`, sem mudar status nem pedir valor
- **Nova funcao `registrarProposta`**: recebe `valorProposta`, faz `update` com `status: docs_received`, `valor_proposta`, `data_envio_proposta` e registra interacao `proposta_enviada` com mudanca de status
- Manter `registrarComparecimentoEProposta` para nao quebrar KanbanBoard (ou atualizar la tambem)
- Exportar as novas funcoes

### 2. `src/components/crm/ComparecimentoModal.tsx`
- Simplificar: quando o usuario clica "Compareceu", confirmar imediatamente (sem pedir valor da proposta)
- Remover o estado de `valorProposta` e a tela de input de valor
- Alterar `onCompareceu` para nao receber parametro de valor: `onCompareceu: () => Promise<void>`

### 3. Nova `src/components/crm/PropostaModal.tsx`
- Modal simples que pede apenas o valor da proposta (campo de moeda R$)
- Botao "Registrar Proposta" que chama a nova funcao

### 4. `src/pages/LeadPage.tsx`
- Alterar `primaryAction` na etapa `scheduling`:
  - Se `comparecimento` ainda nao confirmado: manter "Registrar Comparecimento" 
  - Se `comparecimento === true`: mostrar "Inserir Proposta" como acao primaria
- Adicionar estado `propostaOpen` e renderizar `PropostaModal`
- Atualizar chamada do `ComparecimentoModal` para usar a nova funcao simplificada
- Adicionar botao secundario "Inserir Proposta" visivel quando `lead.status === 'scheduling' && lead.comparecimento === true`

### 5. `src/components/crm/KanbanBoard.tsx`
- Atualizar para usar as mesmas funcoes separadas no Kanban (consistencia)

### 6. `src/components/crm/index.ts`
- Exportar o novo `PropostaModal`
