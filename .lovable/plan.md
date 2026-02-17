

# Diagnóstico e Correção: Respostas diretas nao detectadas

## Situacao atual

A configuracao do webhook na UAZAPI esta correta (URL, eventos, exclusoes). Os logs confirmam que:
- Mensagens de **grupo** do `enove_edinardo` chegam ao webhook normalmente
- Eventos de **status update** (Delivered, Read, Played) de outros corretores tambem chegam
- A tabela `whatsapp_lead_replies` esta **vazia** -- nenhuma resposta direta foi registrada
- Os 3 testes de campanha do Edinardo (phone +5551997010323) enviaram step 2 mesmo com `send_if_replied: false`

## Hipotese principal: formato LID no chatid

Analisando os payloads da UAZAPI v2, cada mensagem traz dois identificadores:
- `chatid`: pode ser `555XXXXXXXXX@s.whatsapp.net` OU `279246475915303@lid` (formato LID)
- `sender_pn`: sempre o telefone real em formato `555XXXXXXXXX@s.whatsapp.net`

O codigo atual extrai o telefone APENAS do `chatid`. Se a UAZAPI enviar respostas diretas com chatid em formato LID, a extracao gera um numero invalido (`+279246475915303`) que nao casa com nenhum registro na fila, e o fluxo inteiro de cancelamento e ignorado silenciosamente.

## Hipotese secundaria: logs rotacionados

Os testes foram feitos ha 3+ horas. Os logs de edge functions rotacionam rapidamente. E possivel que a resposta tenha chegado mas o log ja nao esteja disponivel. Porem, se tivesse sido processada corretamente, a tabela `whatsapp_lead_replies` teria um registro -- e esta vazia.

## Correcoes propostas

### 1. Fallback de extracao de telefone (whatsapp-webhook)

Atualizar a funcao `extractPhoneFromChatId` e o processamento de mensagens para usar `sender_pn` como fallback quando o `chatid` nao esta em formato de telefone:

```text
// Logica atualizada:
1. Tentar extrair de chatid (formato @s.whatsapp.net)
2. Se chatid for formato LID (@lid), usar sender_pn do payload
3. Log de alerta quando fallback for usado
```

### 2. Logging diagnostico aprimorado

Adicionar logs especificos para rastrear CADA resposta direta recebida:
- Log do chatid original e phone extraido
- Log se houve fallback para sender_pn
- Log se encontrou ou nao mensagens enviadas correspondentes

### 3. Tratamento do campo message no messages_update

Os eventos `messages_update` da UAZAPI v2 usam um campo `event` (nao `message`). Atualmente o codigo ignora esses eventos silenciosamente. Embora nao sejam respostas, um log mais limpo evita confusao.

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Editar | `supabase/functions/whatsapp-webhook/index.ts` (fallback phone + logging) |
| Deploy | whatsapp-webhook |

## Teste recomendado

Apos o deploy, o Edinardo deve:
1. Enviar uma campanha com 2 etapas (step 2 com "enviar somente se nao respondeu", delay 5-10 min)
2. Responder ao step 1 imediatamente
3. Verificar nos logs se aparece o log de resposta com o telefone correto
4. Confirmar que `whatsapp_lead_replies` foi populada
5. Confirmar que step 2 foi cancelado (status "cancelled" na fila)

## Detalhes tecnicos

Mudanca principal no webhook:

```text
// ANTES (vulneravel a formato LID):
const phone = extractPhoneFromChatId(chatid);

// DEPOIS (com fallback):
let phone = extractPhoneFromChatId(chatid);
if (chatid.includes("@lid") && msg.sender_pn) {
  phone = extractPhoneFromChatId(msg.sender_pn);
  console.log("Used sender_pn fallback for phone extraction");
}
```

Tambem adicionar `sender_pn` a interface `UAZAPIv2Payload.message`.
