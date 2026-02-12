

## Corrigir botao "Iniciar Atendimento" e notificacao WhatsApp da Roleta

### Problema 1: Botao "Iniciar Atendimento" escondido e sem acao no WhatsApp

O botao existe dentro do `LeadDetailSheet` (painel lateral que abre ao clicar no card), mas:
- Nao e visivel diretamente no card do Kanban -- o corretor precisa clicar no card para encontra-lo
- Ao clicar, apenas marca o status internamente, sem abrir o WhatsApp do lead

**Solucao:** Adicionar um botao "Iniciar Atendimento" diretamente no card do Kanban para leads com roleta pendente (`roleta_id` presente e `status_distribuicao !== 'atendimento_iniciado'`). Ao clicar:
1. Atualiza `status_distribuicao` para `atendimento_iniciado`
2. Define `atendimento_iniciado_em` com timestamp atual
3. Limpa `reserva_expira_em` (para o timeout nao redistribuir)
4. Abre o WhatsApp do lead em nova aba (`wa.me/55{phone}`)

Tambem atualizar o botao existente no `LeadDetailSheet` para abrir o WhatsApp ao iniciar atendimento.

### Problema 2: Notificacao WhatsApp nao chega ao corretor via Roleta

O codigo da funcao `roleta-distribuir` tenta enviar notificacao WhatsApp usando `Deno.env.get("UAZAPI_INSTANCE_URL")`, mas o sistema ja migrou para persistir as credenciais na tabela `global_whatsapp_config`. A funcao `notify-new-lead` ja usa essa tabela corretamente, mas a `roleta-distribuir` nao.

**Solucao:** Atualizar a secao de notificacao WhatsApp da `roleta-distribuir` (passo 8) para buscar as credenciais da tabela `global_whatsapp_config` em vez de depender de variaveis de ambiente, seguindo o mesmo padrao da `notify-new-lead`.

---

### Detalhes tecnicos

**Arquivo 1: `src/components/crm/KanbanCard.tsx`**
- Adicionar prop `onStartService?: (leadId: string) => Promise<void>` ao componente
- Para leads com `lead.roleta_id && lead.status_distribuicao !== 'atendimento_iniciado'`, renderizar um botao verde "Iniciar Atendimento" com icone Play logo acima ou ao lado do botao WhatsApp existente
- Ao clicar: chamar `onStartService(lead.id)` e depois `window.open(whatsappUrl, '_blank')`
- O botao substitui visualmente o botao WhatsApp normal para esses leads (primeira acao = iniciar + abrir WhatsApp)

**Arquivo 2: `src/components/crm/KanbanBoard.tsx`**
- Implementar a funcao `handleStartService` que faz o update no banco:
  - `atendimento_iniciado_em: now()`
  - `status_distribuicao: 'atendimento_iniciado'`
  - `reserva_expira_em: null`
- Passar como prop `onStartService` para o `KanbanCard`

**Arquivo 3: `src/components/crm/LeadDetailSheet.tsx`**
- No botao "Iniciar Atendimento" existente (linha 371), apos o update, abrir `window.open(whatsappUrl)` automaticamente

**Arquivo 4: `supabase/functions/roleta-distribuir/index.ts`**
- Substituir o bloco do passo 8 (linhas ~115-145) para:
  1. Buscar credenciais de `global_whatsapp_config` (instance_name, instance_token, status)
  2. Construir a URL base usando `new URL(Deno.env.get("UAZAPI_INSTANCE_URL")).origin` como fallback
  3. Enviar a mensagem usando o token da tabela, nao da env var
  4. Adicionar logs para debug

