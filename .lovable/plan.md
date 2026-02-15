

# Switch "Enviar agora" desligado por padrao no Follow-Up

## Alteracao

### Arquivo: `src/components/crm/FollowUpSheet.tsx`

Alterar o valor inicial de `isSendNow` de `true` para `false`, tanto na declaracao do estado (linha 82) quanto no reset ao abrir o sheet (linha 86).

Isso fara com que, ao abrir o Follow-Up, o calendario e horario ja aparecam visiveis para o corretor preencher imediatamente, sem precisar desligar o switch manualmente.

### Detalhes tecnicos

- Linha 82: `useState(true)` -> `useState(false)`
- Linha 86: `setIsSendNow(true)` -> `setIsSendNow(false)`
- Nenhuma outra alteracao necessaria

