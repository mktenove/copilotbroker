
# Correção: Opt-outs Falsos Positivos

## Problema Identificado

O webhook de WhatsApp registra opt-outs para **qualquer mensagem recebida** que contenha uma keyword de opt-out, mesmo que o remetente **nunca tenha recebido nenhuma campanha**. Isso causa falsos positivos quando:
- Pessoas mandam mensagens casuais contendo frases como "nao quero mais" (ex: "nao quero mais aquele apartamento do 3 andar")
- Contatos desconhecidos enviam mensagens para o WhatsApp do corretor
- Mensagens de teste sao interpretadas como opt-out

### Evidencias

- **DDD 16 e 63**: Zero leads no sistema com esses DDDs. Sao mensagens de pessoas que mandaram DM para os corretores.
- **Seu telefone** (+55 51 99701-0323): Registrado como "stop", mas voce nunca enviou essa palavra.

## Solucao

Mover a deteccao de opt-out para **dentro** do bloco que verifica se existem mensagens de campanha enviadas para aquele telefone. Ou seja, so registrar opt-out quando:

1. O telefone ja recebeu pelo menos uma mensagem de campanha (existe em `whatsapp_message_queue` com status `sent`)
2. A mensagem recebida contem uma keyword de opt-out

Isso elimina 100% dos falsos positivos de pessoas que nunca foram alvo de campanhas.

## Arquivo a Modificar

**`supabase/functions/whatsapp-webhook/index.ts`**

### Mudanca

Reorganizar o fluxo do handler de mensagens:

Fluxo atual:
```text
1. Verificar mensagens recentes (recentMessages) -> cancelar follow-ups
2. Verificar opt-out em TODAS as mensagens (independente de campanha)
```

Fluxo corrigido:
```text
1. Verificar mensagens recentes (recentMessages) -> cancelar follow-ups
2. Verificar opt-out APENAS se recentMessages existir (telefone recebeu campanha)
3. Se nao tem recentMessages, ignorar keywords de opt-out (e uma conversa normal)
```

Concretamente, mover o bloco de deteccao de opt-out (linhas 318-370) para dentro do bloco `if (recentMessages && recentMessages.length > 0)`, apos o processamento de replies.

## Limpeza de Dados

Remover os 3 opt-outs falsos positivos do banco:
- +5516981448965 (sem leads DDD 16)
- +5563999159000 (sem leads DDD 63) 
- +5551997010323 (telefone de teste do admin)
