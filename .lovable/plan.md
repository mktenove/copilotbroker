

# Corrigir Timezone do Sender + Logar Sucesso/Erro no Historico do Lead

## Problema 1: Mensagem nao foi enviada (Bug de Timezone)

A mensagem para "Teste Maicon" foi corretamente **agendada** pela funcao `auto-first-message` as 21:53 BRT (dentro do horario 09:00-23:00). Porem, o processador de fila (`whatsapp-message-sender`) usa a hora **UTC** para verificar o horario comercial.

```text
auto-first-message:  converte para BRT --> 21:53 BRT --> DENTRO do horario --> agendou
whatsapp-message-sender: usa UTC direto --> 00:53 UTC --> FORA do horario --> pulou
```

Os logs confirmam: "Instance enove_kely_monique outside working hours, skipping" repetidamente.

A mensagem esta presa na fila com status "queued" e 0 tentativas.

## Problema 2: Nao ha log de sucesso/erro no historico

Atualmente:
- `auto-first-message` registra "Primeira mensagem automatica agendada" (tipo `notification`)
- `whatsapp-message-sender` registra "Mensagem enviada via WhatsApp" (tipo `contact_attempt`) APENAS quando envia com sucesso
- Quando **falha** apos todas as tentativas, nao registra nada no historico do lead

O usuario quer ver no historico se a mensagem foi enviada com sucesso ou se falhou.

## Correcoes

### 1. Corrigir timezone no `whatsapp-message-sender` (Edge Function)

Atualizar a funcao `isWithinWorkingHours` para converter a hora UTC para BRT (UTC-3), igual ao que ja e feito no `auto-first-message`:

```text
ANTES:  const currentMinutes = now.getHours() * 60 + now.getMinutes();  // UTC puro
DEPOIS: Converter para BRT antes de comparar (UTC - 3 horas)
```

### 2. Adicionar log de SUCESSO no historico do lead (`whatsapp-message-sender`)

Quando a mensagem for enviada com sucesso, o sender ja registra uma interacao `contact_attempt`. Vamos melhorar a nota para ficar mais claro que e da automacao de primeiro contato (quando `campaign_id` for null e for a primeira mensagem).

### 3. Adicionar log de ERRO no historico do lead (`whatsapp-message-sender`)

Quando a mensagem falhar apos todas as tentativas (status = "failed"), adicionar uma interacao no historico:
- Tipo: `contact_attempt`
- Canal: `whatsapp`
- Nota: Mensagem com erro detalhado, ex: "Falha no envio automatico via WhatsApp: [erro]. Tentativas: 3/3"

### 4. Diferenciar visualmente sucesso/erro na Timeline (`LeadTimeline.tsx`)

Adicionar estilo visual diferente para `contact_attempt` que contenham indicadores de erro vs sucesso nas notas:
- Sucesso (notas com checkmark): borda verde
- Erro (notas com "Falha"): borda vermelha/amarela

## Arquivos a Alterar

- `supabase/functions/whatsapp-message-sender/index.ts` - Corrigir timezone BRT e adicionar log de erro no historico
- `src/components/crm/LeadTimeline.tsx` - Diferenciar visualmente tentativas de contato com sucesso vs erro

## Resultado Esperado

1. A mensagem agendada para 21:53 BRT sera processada corretamente (dentro do horario 09:00-23:00 BRT)
2. No historico do lead, aparecera: "1a msg automatica enviada com sucesso" (verde) ou "Falha no envio automatico: [motivo]" (vermelho)
3. O corretor tera visibilidade completa do resultado da automacao diretamente no card do lead

