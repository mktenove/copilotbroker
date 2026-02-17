

# Diagnóstico: Follow-up enviado mesmo após resposta do lead

## Problema identificado

O sistema de cancelamento de follow-ups **funciona corretamente no código**, mas **não está recebendo as respostas** porque a instância UAZAPI do Edinardo (`enove_edinardo`) não está enviando webhooks para o nosso endpoint.

### Evidências

- A tabela `whatsapp_lead_replies` está **completamente vazia** -- nenhuma resposta foi registrada desde a criação
- Os logs do webhook mostram **apenas mensagens da instância `enove_leonardo`** (todas de grupo, que são corretamente ignoradas)
- **Nenhum log do webhook contém o telefone `5551997010323`** (o telefone do teste do Edinardo)
- A campanha de teste `18b52753` tinha step 2 com `send_if_replied: false`, mas foi enviada porque o sistema nunca soube que houve resposta

### Causa raiz

A instância `enove_edinardo` no painel da UAZAPI **não tem o Webhook URL configurado** (ou está configurado incorretamente). Sem isso, quando o lead responde no WhatsApp, a UAZAPI não notifica o nosso sistema, e todo o fluxo de cancelamento fica impossibilitado.

## Solução

### Passo 1: Configuração na UAZAPI (ação manual)

No painel da UAZAPI, para a instância `enove_edinardo`, configurar o Webhook URL:

```text
https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-webhook
```

Isso precisa ser feito **para todas as instâncias** que utilizam campanhas com follow-up. Recomendo verificar cada instância ativa:
- enove_edinardo
- enove_leonardo (já configurado)
- Todas as demais instâncias listadas no sistema

### Passo 2: Melhoria no código (preventiva)

Adicionar um log de alerta no `whatsapp-message-sender` quando for enviar um step 2+ com `send_if_replied=false` e não encontrar nenhum registro no webhook para aquele telefone -- indicando que o webhook pode não estar configurado para a instância. Isso facilita a detecção futura desse problema.

### Passo 3: Teste de validação

Após configurar o webhook na UAZAPI:
1. Enviar uma campanha de teste com 2 etapas (step 2 com "enviar somente se não respondeu")
2. Responder ao step 1
3. Verificar nos logs do webhook que a resposta foi recebida
4. Confirmar que a tabela `whatsapp_lead_replies` foi populada
5. Confirmar que o step 2 foi cancelado

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Editar | `supabase/functions/whatsapp-message-sender/index.ts` (log de alerta) |
| Manual | Painel UAZAPI: configurar webhook URL para instâncias |

## Resumo

O código está correto. O problema é de **configuração externa**: as instâncias UAZAPI precisam ter o Webhook URL apontando para o nosso endpoint. Sem isso, as respostas dos leads nunca chegam ao sistema.

