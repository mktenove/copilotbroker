

# Horario de Disparo Configuravel pelo Corretor

## Situacao Atual

O backend **ja suporta** horarios configuraveis por corretor:
- A tabela `broker_whatsapp_instances` tem as colunas `working_hours_start` (default 09:00) e `working_hours_end` (default 21:00)
- O endpoint `POST /settings` do `whatsapp-instance-manager` aceita `working_hours_start` e `working_hours_end`
- O `whatsapp-message-sender` valida via `isWithinWorkingHours()` antes de enviar
- O hook `updateSettings` no frontend ja aceita esses campos

O unico problema e que **nao existe UI** para o corretor alterar esses horarios. A aba Seguranca mostra "Horario de envio: 09:00 - 21:00" de forma fixa.

## Alteracoes

### 1. Adicionar campos de horario na `SecurityTab.tsx`

Dentro do card "Limites de Envio", adicionar dois campos de horario (tipo `<input type="time">`) para inicio e fim do expediente:

- Campo "Inicio do expediente" - valor inicial vindo de `instance.working_hours_start`
- Campo "Fim do expediente" - valor inicial vindo de `instance.working_hours_end`
- Ambos incluidos no `handleSaveSettings` junto com os limites de envio

### 2. Atualizar o `handleSaveSettings`

Incluir `working_hours_start` e `working_hours_end` na chamada de `updateSettings()` que ja existe.

### 3. Atualizar a regra anti-spam exibida

Trocar o texto fixo "Horario de envio: 09:00 - 21:00" pelo horario real configurado pelo corretor, lido de `instance.working_hours_start` e `instance.working_hours_end`.

## Arquivo a Alterar

- `src/components/whatsapp/SecurityTab.tsx` - Adicionar inputs de horario e atualizar texto dinamico

## Resultado Esperado

- O corretor pode definir o horario de inicio e fim dos disparos (ex: 08:00 - 20:00)
- Os valores sao salvos no banco e respeitados pelo processador de fila
- A regra anti-spam exibe o horario real configurado

