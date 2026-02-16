
# Correcao: "Enviar somente se o lead nao responder" nao funciona

## Diagnostico

Analisei os logs do webhook, o codigo e os dados do banco. Encontrei **dois problemas** que impedem o cancelamento de follow-ups quando o lead responde:

### Problema 1: Respostas com midia sao completamente ignoradas (principal)

No webhook, quando um lead responde com **audio, imagem, sticker ou qualquer midia**, o campo `text` vem vazio. O codigo atual faz:

```text
if (!messageText) {
    "Empty message from +55..., skipping"  ← PARA AQUI
    return (sem processar nada)
}

// ... logica de cancelamento de follow-up nunca e alcancada
```

Nos logs, encontrei evidencias diretas deste problema:
- `22:14:18` - Reply from +555197639730: "Entendi..." (texto processado)
- `22:14:38` - Empty message from +555197639730, skipping (midia ignorada)
- `22:14:47` - Empty message from +555199404363, skipping (midia ignorada)

Respostas com audio (muito comum no WhatsApp brasileiro) nao disparam o cancelamento.

### Problema 2: Verificacao preventiva do message-sender e fraca

O message-sender faz uma verificacao antes de enviar, mas ela depende de encontrar mensagens ja canceladas com "Lead respondeu" no erro. Se o webhook nunca cancelou nada (por causa do Problema 1), essa verificacao tambem falha.

**Evidencia**: Zero registros com "Lead respondeu" no banco de dados, confirmando que o cancelamento NUNCA foi acionado com sucesso.

## Solucao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

Reestruturar o fluxo de processamento de mensagens recebidas:

1. **Mover a logica de cancelamento de follow-up para ANTES da verificacao de texto vazio** - Qualquer mensagem recebida (texto, audio, imagem, etc.) deve disparar o cancelamento de follow-ups pendentes
2. **Manter a verificacao de optout apenas para mensagens com texto** - Optout depende de palavras-chave, entao so faz sentido para mensagens de texto
3. **Adicionar log para rastrear processamento de respostas com midia**

Fluxo corrigido:
```text
Mensagem recebida (fromMe=false) →
  1. Extrair telefone
  2. Buscar mensagens enviadas para esse telefone (sempre)
  3. Cancelar follow-ups com send_if_replied=false (sempre)
  4. Se tiver texto: verificar optout
  5. Se texto vazio: log e retorno (cancelamento ja foi feito)
```

### Arquivo: `supabase/functions/whatsapp-message-sender/index.ts`

Fortalecer a verificacao preventiva no message-sender:

1. **Adicionar verificacao direta de interacao** - Alem de verificar mensagens canceladas, consultar diretamente se houve alguma resposta recebida no webhook (mensagem enviada com sucesso para o lead, seguida de qualquer atividade de resposta)
2. **Verificar a tabela `lead_interactions`** - Se o lead tem interacoes recentes do tipo `contact_attempt` de canal `whatsapp` seguidas de respostas, cancelar o envio

### Sem mudancas no banco de dados
Apenas correcoes de logica nas Edge Functions.

## Secao Tecnica

### Mudanca principal no webhook (pseudo-codigo)

```text
// ANTES: texto vazio → skip tudo
// DEPOIS: texto vazio → skip optout, mas SEMPRE processar cancelamento

1. Extrair phone do chatid
2. Buscar recentMessages na fila (status=sent, phone=phone)
3. Se encontrou mensagens:
   a. Obter campaign_ids unicos
   b. Chamar cancelFollowUpsOnReply(phone, campaignIds)
   c. Atualizar reply_count das campanhas
   d. Atualizar daily_stats reply_count
4. Se messageText nao vazio:
   a. Verificar optout keywords
   b. Se optout detectado: processar optout
5. Se messageText vazio: log "Media reply processed"
```

### Mudanca no message-sender (verificacao extra)

Adicionar uma query direta ao `lead_interactions` para verificar se o lead respondeu recentemente, como fallback caso o webhook nao tenha conseguido cancelar a tempo.
