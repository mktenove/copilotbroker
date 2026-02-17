

# Cadencia 10D Automatica - Etapas Editaveis

## Resumo

Tornar as etapas da Cadencia 10D automatica completamente editaveis, permitindo ao corretor personalizar mensagens, atrasos e comportamento de cada etapa -- exatamente como funciona na Cadencia 10D manual da pagina do lead.

## O que muda

Atualmente as etapas sao fixas (7 mensagens hardcoded). Com esta alteracao, o corretor podera:
- Editar o texto de cada mensagem
- Alterar o intervalo entre etapas (imediato, 1h, 3h, 1 dia, etc.)
- Escolher se envia mesmo que o lead responda
- Adicionar ou remover etapas
- Usar variaveis ({nome}, {empreendimento}, {corretor_nome})

## Alteracoes

### 1. Nova tabela: `auto_cadencia_steps`

Armazena as etapas customizadas de cada regra.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| rule_id | uuid | FK para broker_auto_cadencia_rules |
| step_order | integer | Ordem da etapa (1, 2, 3...) |
| message_content | text | Texto da mensagem |
| delay_minutes | integer | Atraso em minutos (0 = imediato) |
| send_if_replied | boolean | Enviar mesmo se respondeu |
| created_at | timestamptz | Timestamp |

RLS: mesmas politicas de broker_auto_cadencia_rules (via join com rule_id).

### 2. Atualizar `AutoCadenciaRuleEditor.tsx`

Substituir a lista de preview somente leitura por um editor completo de etapas, reutilizando a mesma UI do `CadenciaSheet.tsx`:
- Textarea para cada mensagem
- Select de delay (30min, 1h, 3h, 6h, 12h, 1d, 2d, 3d, 5d, 7d, 10d)
- RadioGroup para "enviar mesmo que responda" vs "somente se nao responder"
- Botoes de adicionar/remover etapa
- Preview com variaveis substituidas (usando valores de exemplo)
- Ao editar uma regra existente, carregar as etapas salvas da tabela

### 3. Atualizar hook `use-auto-cadencia-rules.ts`

- `createRule`: alem de inserir na tabela de regras, inserir as etapas em `auto_cadencia_steps`
- `updateRule`: atualizar etapas (deletar antigas + inserir novas)
- `fetchRules`: incluir contagem de etapas no select para exibir na listagem
- Adicionar tipo `AutoCadenciaStep` na interface

### 4. Atualizar Edge Function `auto-cadencia-10d`

- Em vez de usar `DEFAULT_STEPS` hardcoded, buscar as etapas de `auto_cadencia_steps` para a regra encontrada
- Se a regra nao tiver etapas customizadas (fallback para regras antigas), usar os DEFAULT_STEPS
- Usar as etapas customizadas para criar campaign_steps e agendar mensagens

### 5. Atualizar `AutoCadenciaSection.tsx`

- Exibir quantidade de etapas customizadas na listagem (ex: "5 etapas" em vez de fixo "7 etapas")

## Detalhes Tecnicos

### Migration SQL

```text
CREATE TABLE public.auto_cadencia_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.broker_auto_cadencia_rules(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  message_content text NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0,
  send_if_replied boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_cadencia_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores podem ver steps das suas regras"
  ON public.auto_cadencia_steps FOR SELECT
  USING (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretores podem inserir steps"
  ON public.auto_cadencia_steps FOR INSERT
  WITH CHECK (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretores podem deletar steps"
  ON public.auto_cadencia_steps FOR DELETE
  USING (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
```

### Edge Function - busca de etapas customizadas

```text
// Buscar etapas da regra
const { data: customSteps } = await supabase
  .from("auto_cadencia_steps")
  .select("*")
  .eq("rule_id", rule.id)
  .order("step_order", { ascending: true });

const steps = (customSteps && customSteps.length > 0) ? customSteps : DEFAULT_STEPS;
```

### Fluxo do editor

1. Ao abrir para criar: inicializa com DEFAULT_STEPS (editaveis)
2. Ao abrir para editar: carrega etapas salvas de `auto_cadencia_steps`
3. Ao salvar: deleta etapas antigas + insere novas em batch

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `auto_cadencia_steps` com RLS |
| `src/components/whatsapp/AutoCadenciaRuleEditor.tsx` | Substituir preview por editor completo de etapas |
| `src/hooks/use-auto-cadencia-rules.ts` | CRUD de etapas junto com regras |
| `supabase/functions/auto-cadencia-10d/index.ts` | Buscar etapas customizadas da regra |
| `src/components/whatsapp/AutoCadenciaSection.tsx` | Exibir contagem real de etapas |

