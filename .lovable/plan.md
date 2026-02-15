
# Corrigir registro completo de mensagens na linha do tempo

## Problemas encontrados

### 1. `whatsapp_manual` nao aparece corretamente na timeline
O tipo `whatsapp_manual` nao esta mapeado no `INTERACTION_META` do `LeadTimeline.tsx`. Ele aparece com icone e label genericos (fallback), sem destaque visual.

### 2. Mensagens automaticas (1a mensagem) nao salvam o conteudo
No `auto-first-message/index.ts` (linha 311-316), o log registrado diz apenas "Primeira mensagem automatica agendada para [horario]" — o texto real da mensagem nao e salvo.

### 3. Mensagens enviadas pelo sender sao truncadas em 80 caracteres
No `whatsapp-message-sender/index.ts` (linha 402), o conteudo e cortado:
```
notes: `${notePrefix}: ${queueMsg.message.substring(0, 80)}...`
```
Isso significa que mensagens longas perdem o conteudo completo.

### 4. Follow-up nao salva o conteudo das mensagens
No `FollowUpSheet.tsx` (linha 182), o log registra apenas "Follow-up WhatsApp agendado: 3 mensagem(ns)" — sem salvar o texto das mensagens.

---

## Solucao proposta

### Arquivo 1: `src/components/crm/LeadTimeline.tsx`
- Adicionar entrada `whatsapp_manual` no `INTERACTION_META` com icone `MessageCircle`, label "WhatsApp Manual", cor emerald e `isHighlight: true`

### Arquivo 2: `supabase/functions/auto-first-message/index.ts`
- Alterar o log de interacao (linha 311-316) para incluir o conteudo completo da mensagem personalizada no campo `notes`
- Formato: "1a mensagem automatica agendada:\n[conteudo completo]"

### Arquivo 3: `supabase/functions/whatsapp-message-sender/index.ts`
- Remover o truncamento `.substring(0, 80)` na linha 402
- Salvar a mensagem completa no campo `notes`

### Arquivo 4: `src/components/crm/FollowUpSheet.tsx`
- Alterar o log de interacao (linha 179-184) para incluir o conteudo de cada etapa da sequencia
- Formato: "Follow-up WhatsApp agendado (X etapas):\n\nEtapa 1: [texto]\nEtapa 2: [texto]..."

---

## Detalhes tecnicos

### LeadTimeline.tsx — nova entrada no INTERACTION_META
```typescript
whatsapp_manual: { icon: MessageCircle, label: "WhatsApp Manual", color: "text-emerald-400", dotColor: "bg-emerald-500", isHighlight: true },
```
Tambem adicionar import de `MessageCircle` do lucide-react.

### auto-first-message/index.ts — log com conteudo completo
Linha 311-316 alterada para:
```typescript
await supabase.from("lead_interactions").insert({
  lead_id: leadId,
  broker_id: lead.broker_id,
  interaction_type: "notification",
  channel: "whatsapp",
  notes: `1ª mensagem automática agendada para ${scheduledAt.toLocaleString(...)}\n\n${personalizedMessage}`,
});
```

### whatsapp-message-sender/index.ts — remover truncamento
Linha 402 alterada de:
```typescript
notes: `${notePrefix}: ${queueMsg.message.substring(0, 80)}...`
```
Para:
```typescript
notes: `${notePrefix}\n\n${queueMsg.message}`
```

### FollowUpSheet.tsx — incluir conteudo das etapas
Linha 179-184 alterada para concatenar o conteudo de cada step:
```typescript
const stepsPreview = steps.map((s, i) => `Etapa ${i+1}: ${s.messageContent}`).join("\n");
await supabase.from("lead_interactions").insert({
  lead_id: leadId,
  interaction_type: "note_added",
  channel: "whatsapp",
  notes: `Follow-up WhatsApp agendado (${steps.length} etapas):\n\n${stepsPreview}`,
  created_by: (await supabase.auth.getUser()).data.user?.id,
});
```
