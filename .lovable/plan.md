
# Fechar calendario automaticamente ao selecionar data

## Problema
Em todos os date pickers do sistema, ao clicar em um dia no calendario, a data e selecionada mas o popover permanece aberto. O usuario precisa clicar fora para fecha-lo.

## Solucao
Converter os `Popover` que envolvem calendarios de "nao controlados" para "controlados" (com estado `open`/`onOpenChange`), e fechar automaticamente ao selecionar uma data.

## Arquivos afetados

### 1. `src/components/crm/AgendamentoModal.tsx`
- Adicionar estado `calendarOpen` controlando o Popover
- No `onSelect` do Calendar, setar a data e fechar o popover

### 2. `src/components/crm/VendaModal.tsx`
- Mesmo ajuste: estado `calendarOpen` + fechar ao selecionar

### 3. `src/components/crm/FollowUpSheet.tsx`
- Mesmo ajuste para o date picker de agendamento do follow-up

## Detalhe tecnico

O padrao e o mesmo nos 3 arquivos. De:
```typescript
<Popover>
```
Para:
```typescript
const [calendarOpen, setCalendarOpen] = useState(false);

<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
```

E no `onSelect` do Calendar:
```typescript
onSelect={(d) => {
  setDate(d);
  setCalendarOpen(false);
}}
```
