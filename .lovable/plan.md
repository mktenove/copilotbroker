
# Correção Permanente: Mensagens Duplicadas na Cadência 10D

## Diagnóstico

A Salete Antonow dos Reis recebeu 2x a mesma mensagem porque **duas campanhas de Cadência 10D foram criadas simultaneamente** (150ms de diferença). Isso afetou **8 leads** no total.

### Causa Raiz (dupla)

1. **Dupla invocação**: Quando um lead é cadastrado, a função `auto-cadencia-10d` é chamada de **dois lugares ao mesmo tempo**:
   - Pelo backend (`roleta-distribuir`) ao atribuir o lead
   - Pelo frontend (`GVFormSection`, `MCFormSection`, `FormSection`) ao submeter o formulário

2. **Sem proteção contra concorrência**: A verificação de campanha ativa (SELECT simples) permite que ambas as chamadas passem antes que qualquer uma insira.

3. **Deduplicação no sender insuficiente**: O motor de envio verifica duplicatas por `campaign_id + phone + step`, mas como são campanhas *diferentes*, não detecta.

## Solução (3 camadas de proteção)

### Camada 1: Remover invocações duplicadas do frontend

Remover as chamadas a `auto-cadencia-10d` dos formulários de landing page (`FormSection.tsx`, `GVFormSection.tsx`, `MCFormSection.tsx`), pois a `roleta-distribuir` já faz essa chamada no backend. Manter apenas a chamada do backend.

### Camada 2: Lock no banco de dados (proteção definitiva)

Criar um **indice unico parcial** na tabela `whatsapp_campaigns` para impedir fisicamente duas campanhas ativas para o mesmo lead:

```text
CREATE UNIQUE INDEX idx_unique_active_cadencia_per_lead
ON whatsapp_campaigns (lead_id)
WHERE lead_id IS NOT NULL
  AND status IN ('running', 'scheduled');
```

Com isso, mesmo que duas chamadas concorrentes passem pela verificação SELECT, a segunda INSERT falhará com erro de unicidade.

### Camada 3: Tratamento do conflito na edge function

Atualizar `auto-cadencia-10d` para capturar o erro de constraint unique (`23505`) e retornar graciosamente em vez de falhar:

```text
if (campErr?.code === "23505") {
  // Outra instância já criou a campanha
  return { status: "skipped", reason: "concurrent_creation" };
}
```

### Camada 4: Deduplicação cross-campaign no sender

Atualizar o `whatsapp-message-sender` para verificar duplicatas **por telefone + step + lead** independente da campanha, evitando envio duplo mesmo se campanhas duplicadas existirem:

```text
// Antes do envio, verificar se este lead/phone
// já recebeu step 1 de QUALQUER cadência nas últimas 24h
SELECT id FROM whatsapp_message_queue
WHERE phone = X AND step_number = Y AND lead_id = Z
  AND status = 'sent'
  AND sent_at > now() - interval '24 hours'
  AND id != current_id
```

## Arquivos a modificar

1. **`src/components/FormSection.tsx`** -- Remover chamada a `auto-cadencia-10d`
2. **`src/components/goldenview/GVFormSection.tsx`** -- Remover chamada a `auto-cadencia-10d`
3. **`src/components/mauriciocardoso/MCFormSection.tsx`** -- Remover chamada a `auto-cadencia-10d`
4. **Migração SQL** -- Criar indice unico parcial em `whatsapp_campaigns(lead_id)`
5. **`supabase/functions/auto-cadencia-10d/index.ts`** -- Tratar erro 23505 graciosamente
6. **`supabase/functions/whatsapp-message-sender/index.ts`** -- Dedup cross-campaign por lead+phone+step

## Limpeza dos dados existentes

Cancelar campanhas e mensagens duplicadas dos 8 leads afetados (manter apenas a primeira campanha de cada lead).
