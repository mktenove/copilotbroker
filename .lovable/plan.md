

# Automacao de Cadencia 10D por Empreendimento

## Resumo

Criar um novo tipo de automacao na aba "Automacao" do WhatsApp que permite ao corretor ativar automaticamente o fluxo Cadencia 10D para leads recebidos de um empreendimento especifico. Quando um lead e atribuido ao corretor (seja diretamente ou via roleta), o sistema automaticamente:

1. Ativa a Cadencia 10D completa (7 etapas)
2. Move o lead para "Atendimento" (status `info_sent`)
3. Marca como `atendimento_iniciado` para evitar timeout da roleta

## Arquitetura

O fluxo sera acionado pela Edge Function `roleta-distribuir` (para leads via roleta) e pelas landing pages (para leads diretos). Apos atribuir o broker, o sistema verifica se existe uma regra de auto-cadencia ativa para aquele broker + empreendimento e, se sim, cria a campanha automaticamente no backend.

## Alteracoes

### 1. Nova tabela: `broker_auto_cadencia_rules`

Tabela para armazenar regras de auto-ativacao de cadencia por corretor/empreendimento.

Colunas:
- `id` (uuid, PK)
- `broker_id` (uuid, NOT NULL)
- `project_id` (uuid, NULL = todos)
- `is_active` (boolean, default true)
- `created_at` / `updated_at` (timestamps)

RLS: mesmas politicas de `broker_auto_message_rules` (corretor ve/edita as suas, admin ve todas).

Unique constraint em `(broker_id, project_id)` para evitar duplicatas.

### 2. Nova Edge Function: `auto-cadencia-10d`

Recebe `{ leadId }` e executa:

1. Busca o lead (broker_id, project_id, status, whatsapp, name)
2. Verifica se o broker tem regra ativa em `broker_auto_cadencia_rules` para o project_id do lead (ou regra global)
3. Verifica se ja existe cadencia ativa para o lead
4. Verifica instancia WhatsApp do corretor conectada
5. Cria `whatsapp_campaigns` com status "running" e `lead_id`
6. Insere as 7 etapas padrao em `campaign_steps`
7. Agenda mensagens em `whatsapp_message_queue`
8. Move lead para `info_sent` + marca `atendimento_iniciado` + limpa `reserva_expira_em`
9. Registra na timeline (`lead_interactions`)

As mensagens padrao sao as mesmas 7 etapas do `CadenciaSheet.tsx` (DEFAULT_STEPS), com substituicao de variaveis.

### 3. Modificar `roleta-distribuir` Edge Function

Apos atribuir o lead ao corretor (passo 6b), adicionar chamada para `auto-cadencia-10d`:

```text
// Apos atribuicao, tentar ativar cadencia automatica
fetch(`${supabaseUrl}/functions/v1/auto-cadencia-10d`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer ..." },
  body: JSON.stringify({ leadId: lead_id })
})
```

### 4. Modificar landing pages (FormSection, GVFormSection, MCFormSection)

Apos inserir o lead e chamar `auto-first-message`, tambem chamar `auto-cadencia-10d` de forma nao-bloqueante. A Edge Function internamente verifica se existe regra ativa antes de executar.

### 5. Frontend: Nova secao na `AutoMessageTab`

Dividir a aba em duas secoes:
- **1a Mensagem** (funcionalidade existente)
- **Cadencia 10D** (nova funcionalidade)

Usar `Tabs` ou `Accordion` para separar visualmente.

### 6. Novo hook: `use-auto-cadencia-rules.ts`

Similar ao `use-auto-message-rules.ts`, mas para a tabela `broker_auto_cadencia_rules`. CRUD completo.

### 7. Novo componente: `AutoCadenciaRuleEditor`

Sheet de criacao/edicao com:
- Selector de empreendimento (igual ao existente)
- Opcao "Todos os empreendimentos"
- Preview das 7 etapas padrao (somente leitura)
- Toggle ativo/inativo

## Detalhes Tecnicos

### Tabela SQL

```text
CREATE TABLE public.broker_auto_cadencia_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(broker_id, project_id)
);

ALTER TABLE public.broker_auto_cadencia_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies (mesmas do broker_auto_message_rules)
CREATE POLICY "Corretores podem ver suas regras cadencia"
  ON public.broker_auto_cadencia_rules FOR SELECT
  USING (broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'));

-- INSERT, UPDATE, DELETE policies similares
```

### Edge Function `auto-cadencia-10d`

Logica principal:
1. Buscar lead
2. Buscar regra ativa (project-specific primeiro, fallback global)
3. Se nao tem regra, retorna `skipped`
4. Verificar se ja tem cadencia ativa
5. Buscar instancia WhatsApp conectada
6. Criar campanha + steps + queue (replicando logica do CadenciaSheet)
7. Atualizar lead: `status = info_sent`, `atendimento_iniciado_em = now()`, `status_distribuicao = atendimento_iniciado`, `reserva_expira_em = null`
8. Registrar na timeline

### Prevencao de timeout da roleta

Ao definir `status_distribuicao = 'atendimento_iniciado'` e `reserva_expira_em = null`, o lead nao sera redistribuido pelo `roleta-timeout`, pois esse sistema verifica esses campos antes de reassignar.

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `broker_auto_cadencia_rules` |
| `supabase/functions/auto-cadencia-10d/index.ts` | Nova Edge Function |
| `supabase/config.toml` | Registrar nova function |
| `supabase/functions/roleta-distribuir/index.ts` | Chamar auto-cadencia apos atribuicao |
| `src/components/FormSection.tsx` | Chamar auto-cadencia apos insert |
| `src/components/goldenview/GVFormSection.tsx` | Idem |
| `src/components/mauriciocardoso/MCFormSection.tsx` | Idem |
| `src/hooks/use-auto-cadencia-rules.ts` | Novo hook CRUD |
| `src/types/auto-message.ts` | Adicionar tipo `BrokerAutoCadenciaRule` |
| `src/components/whatsapp/AutoMessageTab.tsx` | Adicionar secao Cadencia 10D |
| `src/components/whatsapp/AutoCadenciaRuleEditor.tsx` | Novo editor de regras |
| `src/components/whatsapp/index.ts` | Exportar novos componentes |

