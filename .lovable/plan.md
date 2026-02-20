

# Corrigir botoes de acao para refletir estado do comparecimento

## Problema identificado

Na etapa de **Agendamento** (`scheduling`), o botao primario tem 3 estados possiveis baseados no campo `comparecimento`:

| `comparecimento` | Estado | Acao esperada |
|---|---|---|
| `null` | Ainda nao registrado | Registrar Comparecimento |
| `true` | Compareceu | Inserir Proposta |
| `false` | Nao compareceu | Reagendar |

Atualmente, o codigo trata `null` e `false` da mesma forma (ambos mostram "Registrar Comparecimento"), o que esta incorreto. Apos registrar nao comparecimento, o botao deveria mudar para "Reagendar" (consistente com o comportamento do Kanban descrito na memoria `crm-kanban-dynamic-scheduling-actions`).

## Solucao

### Arquivo: `src/pages/LeadPage.tsx`

1. **Atualizar o `primaryAction` memo** (linhas 269-273) para distinguir entre `comparecimento === null` e `comparecimento === false`:
   - `null` -> "Registrar Comparecimento" (abre modal de comparecimento)
   - `false` -> "Reagendar" (abre modal de agendamento em modo reagendamento)
   - `true` -> "Inserir Proposta" (comportamento atual, mantido)

2. **Atualizar o `handlePrimaryAction`** para tratar a nova acao "reagendar" abrindo o modal de agendamento em modo reagendamento (`setAgendamentoReagendar(true)`)

3. **Atualizar o tooltip da barra de progresso** (linha 393) para tambem refletir os 3 estados ao passar o mouse na proxima etapa

4. **Atualizar o clique na barra de progresso** (linhas 411-413) para o caso `docs_received` tambem tratar `comparecimento === false` abrindo o reagendamento

### Detalhes tecnicos

O `primaryAction` memo ficara:

```typescript
case "scheduling":
  if (lead.comparecimento === true) {
    return { label: "Inserir Proposta", icon: DollarSign, color: "bg-purple-500 hover:bg-purple-600", action: "proposta" };
  }
  if (lead.comparecimento === false) {
    return { label: "Reagendar", icon: RotateCw, color: "bg-amber-500 hover:bg-amber-600 text-black", action: "reagendar" };
  }
  return { label: "Registrar Comparecimento", icon: Eye, color: "bg-blue-500 hover:bg-blue-600", action: "comparecimento" };
```

E no `handlePrimaryAction`:

```typescript
case "reagendar": setAgendamentoReagendar(true); break;
```

Nenhuma alteracao de banco necessaria. Apenas 1 arquivo editado.

