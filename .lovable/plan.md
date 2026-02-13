

## Teste real de campanha com cancelamento de follow-up

### Objetivo
Criar uma campanha real com 2 steps usando a instancia `enove_maicon` (conectada), enviar para o lead "Teste Maicon" (+5551997010323), e verificar que o Step 2 e cancelado quando voce responder.

### Dados do teste

| Item | Valor |
|------|-------|
| Broker | Maicon (ID: `68db81c3-b187-42e0-89fb-fbb05e4a67fd`) |
| Instancia | `enove_maicon` (conectada) |
| Lead | Teste Maicon (ID: `cca68eab-d371-4f0b-8b9d-fcf1062d75be`) |
| Telefone | +5551997010323 |

### Etapas de execucao

**1. Inserir campanha no banco**
- Nome: "TESTE REAL: Cancelamento por Resposta"
- Status: `running`
- broker_id do Maicon

**2. Inserir 2 campaign_steps**
- Step 1: "Ola Maicon, tudo bem? Teste de campanha automatica." (delay: 0, send_if_replied: true)
- Step 2: "Maicon, esse follow-up SO deve chegar se voce NAO responder." (delay: 3 min, send_if_replied: **false**)

**3. Inserir 2 mensagens na fila (whatsapp_message_queue)**
- Mensagem 1: status `scheduled`, scheduled_at = agora (sera enviada no proximo ciclo do cron)
- Mensagem 2: status `scheduled`, scheduled_at = agora + 3 minutos, step_number = 2

**4. Aguardar envio do Step 1** (o cron roda a cada minuto)

**5. Voce responde no WhatsApp** (qualquer mensagem)

**6. O webhook processa a resposta e cancela o Step 2**

**7. Verificar no banco que o Step 2 tem status `cancelled`**

### O que valida

- Envio real via UAZAPI funciona
- Webhook recebe resposta real do WhatsApp
- Logica de cancelamento funciona em producao
- A mensagem "Maicon, esse follow-up SO deve chegar se voce NAO responder" **nunca sera entregue**

### Secao tecnica

Serao executadas 3 operacoes de INSERT no banco:
1. `whatsapp_campaigns` - 1 registro
2. `campaign_steps` - 2 registros  
3. `whatsapp_message_queue` - 2 registros (step 1 agendado para agora, step 2 para +3 min)

Apos confirmacao do teste, os dados serao limpos com DELETE.

