

# Horario de Pausa do Timeout nas Roletas

## O que sera feito

Adicionar configuracao de "horario sem timeout" em cada roleta, permitindo definir um intervalo (ex: 21h as 9h) onde a transferencia automatica por timeout nao ocorre. Leads que expirarem nesse horario permanecem com o corretor atual ate o horario permitido voltar.

## Mudancas

### 1. Banco de Dados (migracao)

Adicionar duas colunas na tabela `roletas`:

- `timeout_pausa_inicio` (time, default '21:00') -- hora em que o timeout para
- `timeout_pausa_fim` (time, default '09:00') -- hora em que o timeout volta

### 2. Edge Function `roleta-timeout/index.ts`

Antes de processar cada lead expirado, verificar se o horario atual (Brasilia, UTC-3) esta dentro do intervalo de pausa da roleta. Se estiver, pular o lead sem redistribuir.

Logica:
```text
horaAtual = now em UTC-3
se pausa_inicio > pausa_fim (cruza meia-noite, ex: 21h-9h):
   pausado = horaAtual >= pausa_inicio OU horaAtual < pausa_fim
senao:
   pausado = horaAtual >= pausa_inicio E horaAtual < pausa_fim
```

### 3. Tipo `src/types/roleta.ts`

Adicionar `timeout_pausa_inicio` e `timeout_pausa_fim` na interface `Roleta`.

### 4. UI `src/components/admin/RoletaManagement.tsx`

No bloco de configuracao de timeout (quando expandido), adicionar dois campos de horario (selects de hora) para definir o intervalo de pausa. Tambem no formulario de criacao da roleta.

Visualmente ficara abaixo do slider de tempo de reserva:
```
Horario sem transferencia:
[21:00] ate [09:00]
```

### 5. Hook `src/hooks/use-roletas.ts`

O hook ja usa `as any` para queries, entao os novos campos serao retornados automaticamente sem alteracao no hook.

## Arquivos

| Acao | Arquivo |
|------|---------|
| Migracao | Adicionar colunas `timeout_pausa_inicio` e `timeout_pausa_fim` em `roletas` |
| Editar | `src/types/roleta.ts` |
| Editar | `supabase/functions/roleta-timeout/index.ts` |
| Editar | `src/components/admin/RoletaManagement.tsx` |

