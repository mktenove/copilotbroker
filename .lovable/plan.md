
# Modulo Completo de Propostas

## Resumo
Criar um sistema completo de propostas dentro da pagina do lead, substituindo o modal simples atual por um formulario estruturado com historico, versionamento, status, geracao de PDF e encaminhamento ao vendedor.

## 1. Nova tabela no banco de dados: `propostas`

```text
propostas
- id (uuid, PK)
- lead_id (uuid, FK -> leads)
- project_id (uuid, FK -> projects, nullable)
- broker_id (uuid, nullable)
- created_by (uuid, nullable)
- unidade (text)
- valor_proposta (numeric)
- valor_entrada (numeric)
- forma_pagamento_entrada (text: "a_vista" | "parcelado")
- parcelamento (text, descricao do parcelamento)
- permuta (boolean, default false)
- descricao_permuta (text, nullable)
- observacoes_corretor (text, nullable)
- condicoes_especiais (text, nullable)
- status_proposta (text: "pendente" | "enviada_vendedor" | "aprovada" | "rejeitada", default "pendente")
- enviada_vendedor_em (timestamptz, nullable)
- aprovada_em (timestamptz, nullable)
- rejeitada_em (timestamptz, nullable)
- motivo_rejeicao (text, nullable)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
```

RLS: mesmas regras dos leads (admins veem tudo, corretores veem das suas leads, lideres veem da equipe). Realtime habilitado.

## 2. Novo componente: `PropostaModal.tsx` (reescrita completa)

O modal atual sera completamente reescrito com os seguintes campos:

**Dados do imovel:**
- Empreendimento (pre-preenchido do lead, editavel via Select)
- Unidade (texto livre)

**Dados financeiros:**
- Valor da proposta (input currency)
- Valor de entrada (input currency)
- Forma de pagamento da entrada (select: A Vista / Parcelado)
- Parcelamento (texto descritivo)
- Permuta (switch Sim/Nao)
- Descricao da permuta (textarea, condicional)

**Calculo automatico:** exibir resumo com total (valor proposta = entrada + financiamento implicito)

**Dados estrategicos:**
- Observacoes do corretor (textarea)
- Condicoes especiais solicitadas (textarea)

O modal sera um Dialog maior (sm:max-w-2xl) com scroll interno, dividido em secoes visuais.

## 3. Novo componente: `PropostasList.tsx`

Secao na pagina do lead que lista todas as propostas do lead, exibindo:
- Numero da proposta (sequencial)
- Data de criacao
- Valor
- Status (badge colorido: pendente/enviada/aprovada/rejeitada)
- Botoes de acao por proposta:
  - "Aprovar" -> muda status para aprovada, libera botao "Confirmar Venda"
  - "Rejeitar" -> muda status para rejeitada, permite nova proposta ou inativar
  - "Gerar PDF" -> gera documento em nova aba
  - "Encaminhar ao Vendedor" -> registra timestamp, muda status para enviada_vendedor

## 4. Geracao de PDF

Sera implementado via funcao client-side usando a API nativa do browser (`window.print` com pagina formatada ou geracao via canvas/HTML).

O PDF contera:
- Logo da imobiliaria (asset existente em /src/assets/logo-enove.png)
- Dados do cliente (nome, whatsapp, email, cpf)
- Dados do imovel (empreendimento, unidade)
- Valores (proposta, entrada, forma de pagamento, parcelamento)
- Permuta (se aplicavel)
- Observacoes e condicoes especiais
- Data da proposta
- Nome do corretor

Sera aberto em uma nova janela estilizada para impressao/PDF.

## 5. Encaminhamento ao Vendedor

Botao "Encaminhar Proposta ao Vendedor" com opcoes:
- Via WhatsApp: abre link wa.me com texto resumido da proposta
- Download manual: aciona a geracao do PDF

Ao encaminhar, registra `enviada_vendedor_em` e altera `status_proposta` para "enviada_vendedor".

## 6. Alteracoes na pagina do Lead (`LeadPage.tsx`)

- Adicionar secao "Propostas" entre "Progresso Comercial" e "Metricas"
- Botao "Nova Proposta" no topo da secao
- Lista de propostas com cards expandiveis
- Quando proposta aprovada: exibir destaque e liberar "Confirmar Venda"
- Quando proposta rejeitada: exibir badge vermelho e permitir nova proposta ou inativar

## 7. Ajuste no fluxo do funil

- O `registrarProposta` no hook `use-kanban-leads.ts` sera atualizado para:
  - Criar registro na tabela `propostas` (alem de atualizar o lead)
  - O lead permanece em "docs_received" (Proposta) ao registrar proposta
  - Somente ao aprovar uma proposta o botao "Confirmar Venda" fica disponivel
  - Proposta rejeitada permite: nova proposta ou marcar como perda

## 8. Timeline

Interacoes de proposta serao registradas no `lead_interactions`:
- `proposta_enviada` (ja existe)
- Novos tipos nao sao necessarios pois usaremos notes descritivas dentro de `proposta_enviada`

---

## Secao Tecnica - Arquivos

### Novos arquivos:
1. `supabase/migrations/xxx.sql` - Criacao da tabela propostas + RLS + realtime
2. `src/components/crm/PropostaModal.tsx` - Reescrita completa do modal
3. `src/components/crm/PropostasList.tsx` - Lista de propostas do lead
4. `src/components/crm/PropostaPDF.tsx` - Componente de geracao de PDF
5. `src/hooks/use-propostas.ts` - Hook para CRUD de propostas

### Arquivos modificados:
1. `src/pages/LeadPage.tsx` - Integrar secao de propostas e ajustar fluxo
2. `src/hooks/use-kanban-leads.ts` - Ajustar `registrarProposta` para criar na nova tabela
3. `src/components/crm/index.ts` - Exportar novos componentes
4. `src/types/crm.ts` - Adicionar tipo `Proposta` e status

### Migracao SQL:
```text
CREATE TABLE public.propostas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  broker_id uuid,
  created_by uuid,
  unidade text,
  valor_proposta numeric NOT NULL,
  valor_entrada numeric,
  forma_pagamento_entrada text DEFAULT 'a_vista',
  parcelamento text,
  permuta boolean DEFAULT false,
  descricao_permuta text,
  observacoes_corretor text,
  condicoes_especiais text,
  status_proposta text DEFAULT 'pendente',
  enviada_vendedor_em timestamptz,
  aprovada_em timestamptz,
  rejeitada_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies (mesma logica de lead_interactions)
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access propostas"
  ON public.propostas FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Corretores podem ver/inserir/atualizar propostas dos seus leads
CREATE POLICY "Corretores select propostas"
  ON public.propostas FOR SELECT
  USING (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

CREATE POLICY "Corretores insert propostas"
  ON public.propostas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

CREATE POLICY "Corretores update propostas"
  ON public.propostas FOR UPDATE
  USING (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

-- Lideres podem ver propostas da equipe
CREATE POLICY "Lideres select propostas"
  ON public.propostas FOR SELECT
  USING (has_role(auth.uid(), 'leader') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id IN (
      SELECT id FROM brokers WHERE lider_id = get_my_broker_id()
    )
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas;
```
