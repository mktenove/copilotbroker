
# Controle de Timeout na Roleta + Notificacao WhatsApp Completa

## Problema 1: Vazamento de dados do lead na notificacao
Quando o timeout da roleta e ativado, o corretor anterior ja recebeu uma notificacao WhatsApp com nome e telefone do lead. Se o lead for transferido automaticamente, o corretor anterior ainda tem esses dados e poderia contatar o lead por fora do sistema.

## Problema 2: Corretor nao recebe WhatsApp no timeout
A edge function `roleta-timeout` cria uma notificacao no banco (in-app), mas nao envia notificacao via WhatsApp ao novo corretor.

---

## Solucao

### 1. Nova coluna na tabela `roletas`: `timeout_ativo`
Adicionar um campo booleano `timeout_ativo` (default: true) que o lider pode ativar/desativar por roleta.

- **timeout_ativo = true**: O sistema aplica o tempo maximo de atendimento. A notificacao WhatsApp da atribuicao inicial **nao inclui nome e telefone do lead** (apenas avisa que ha um novo lead e pede para abrir o sistema). Quando ocorre timeout, o lead e redistribuido normalmente.
- **timeout_ativo = false**: O corretor recebe o lead sem prazo. A notificacao WhatsApp **inclui todos os dados do lead** (nome, telefone, empreendimento) como funciona hoje. Nao ha redistribuicao por timeout.

Quando `timeout_ativo = false`:
- O campo `reserva_expira_em` nao sera preenchido na atribuicao
- A function `roleta-timeout` ignorara esses leads (ja ignora pois so busca leads com `reserva_expira_em` preenchido)

### 2. Atualizar `roleta-distribuir` (Edge Function)
- Buscar o campo `timeout_ativo` da roleta
- Condicionar a mensagem WhatsApp:
  - Se `timeout_ativo = true`: mensagem sem dados do lead ("Novo lead disponivel no sistema. Acesse o CRM para atender.")
  - Se `timeout_ativo = false`: mensagem completa com nome, telefone e empreendimento (como hoje)
- Quando `timeout_ativo = false`, nao preencher `reserva_expira_em`

### 3. Atualizar `roleta-timeout` (Edge Function)
Adicionar envio de notificacao WhatsApp para o novo corretor quando o lead e reassinado por timeout. A mensagem tambem sera sem dados do lead (ja que timeout so ocorre quando `timeout_ativo = true`).

### 4. Atualizar `transfer_lead` (RPC / transferencia manual)
Apos a transferencia manual, enviar notificacao WhatsApp ao novo corretor com os dados completos do lead (transferencia manual nao tem restricao de dados).

Isso sera feito criando uma nova edge function `notify-transfer` que sera chamada pelo frontend apos a RPC `transfer_lead` retornar sucesso.

### 5. Atualizar UI de gerenciamento da roleta
No formulario de criacao e no painel expandido de cada roleta, adicionar um toggle "Tempo maximo para atendimento" que controla o campo `timeout_ativo`. Quando ativado, exibir o slider de tempo. Quando desativado, ocultar o slider.

---

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER TABLE public.roletas ADD COLUMN timeout_ativo boolean NOT NULL DEFAULT true;
```

### Arquivos afetados
- **Migracao SQL**: adicionar coluna `timeout_ativo` em `roletas`
- **`supabase/functions/roleta-distribuir/index.ts`**: ler `timeout_ativo`, condicionar mensagem WhatsApp e `reserva_expira_em`
- **`supabase/functions/roleta-timeout/index.ts`**: adicionar envio WhatsApp ao novo corretor (mensagem sem dados do lead)
- **`supabase/functions/notify-transfer/index.ts`** (novo): enviar WhatsApp ao corretor destino com dados completos do lead na transferencia manual
- **`src/components/crm/TransferLeadDialog.tsx`**: chamar `notify-transfer` apos sucesso da RPC
- **`src/components/admin/RoletaManagement.tsx`**: toggle de timeout no formulario de criacao e no painel expandido
- **`src/components/broker/BrokerRoletas.tsx`**: exibir se o timeout esta ativo na visualizacao do corretor (informativo)
- **`src/types/roleta.ts`**: adicionar campo `timeout_ativo` na interface
- **`src/hooks/use-roletas.ts`**: nenhuma alteracao necessaria (ja usa `select *`)

### Fluxo de notificacao resumido

```text
Atribuicao inicial (timeout_ativo=true):
  WhatsApp: "Novo lead disponivel. Acesse o CRM para atender. Tempo: 10min"
  (sem nome/telefone do lead)

Atribuicao inicial (timeout_ativo=false):
  WhatsApp: "Novo lead: Joao - 51999... - GoldenView"
  (com todos os dados, como funciona hoje)

Timeout (reassinacao automatica):
  WhatsApp: "Lead reassinado por timeout. Acesse o CRM para atender."
  (sem nome/telefone)

Transferencia manual:
  WhatsApp: "Lead transferido: Joao - 51999... - GoldenView"
  (com todos os dados)
```
