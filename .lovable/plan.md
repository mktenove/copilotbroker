

# Fluxo de Pagamento Detalhado na Proposta

## Problema Atual
O modal de proposta tem apenas dois campos financeiros (valor da proposta e valor de entrada), com um campo texto livre para parcelamento. Isso nao permite registrar fluxos complexos como: entrada parcelada + dacao em pagamento + financiamento com reforcos e indice de correcao.

## Solucao
Criar um sistema de **parcelas dinamicas** onde o corretor adiciona quantas linhas de pagamento precisar, cada uma com tipo, valor, quantidade de parcelas, descricao e indice de correcao. O sistema calcula automaticamente o total e valida se fecha com o valor da proposta.

## Exemplo do usuario
Proposta total: R$ 500.000
- Entrada: R$ 100.000, parcelado em 10x de R$ 10.000
- Dacao em pagamento: R$ 220.000, terreno em Estancia Velha
- Financiamento: R$ 180.000, 100x com 6 reforcos semestrais de R$ 10.000, corrigido pelo INCC

## Alteracoes

### 1. Nova tabela: `proposta_parcelas`

Tabela filha de `propostas` para armazenar cada linha do fluxo de pagamento.

```text
proposta_parcelas
- id (uuid, PK)
- proposta_id (uuid, FK -> propostas, ON DELETE CASCADE)
- tipo (text): "entrada", "dacao_pagamento", "financiamento", "sinal", "parcelas_mensais", "reforco", "balao", "outro"
- valor (numeric, NOT NULL)
- quantidade_parcelas (integer, nullable) - ex: 10, 100
- valor_parcela (numeric, nullable) - ex: 10.000
- descricao (text, nullable) - descricao livre, ex: "terreno em Estancia Velha"
- indice_correcao (text, nullable) - ex: "INCC", "IGPM", "IPCA", "nenhum"
- observacao (text, nullable) - ex: "6 reforcos semestrais de R$ 10.000"
- ordem (integer, default 0)
- created_at (timestamptz, default now())
```

RLS: mesmas regras da tabela propostas (via join com propostas -> leads -> broker_id).

### 2. Reformular o PropostaModal

Substituir os campos fixos (valor_entrada, forma_pagamento_entrada, parcelamento) por uma lista dinamica de parcelas:

- Manter o campo "Valor da Proposta" (valor total)
- Remover campos de entrada/parcelamento fixos
- Adicionar secao "Fluxo de Pagamento" com botao "+ Adicionar Parcela"
- Cada parcela tem: Tipo (select), Valor, Qtd Parcelas, Valor/Parcela, Descricao, Indice de Correcao, Observacao
- Calcular automaticamente: soma das parcelas vs valor da proposta
- Exibir diferenca (falta compor / excede) em tempo real
- Manter a secao de permuta como um tipo de parcela "dacao_pagamento"

Tipos disponiveis no select:
- Sinal
- Entrada (a vista)
- Entrada (parcelada)
- Dacao em Pagamento
- Financiamento
- Parcelas Mensais
- Reforco Semestral/Anual
- Balao
- Outro

### 3. Atualizar PropostasList

- Exibir as parcelas de cada proposta no card expandido (buscar da tabela proposta_parcelas)
- Substituir os campos fixos de entrada/parcelamento pela lista de parcelas

### 4. Atualizar PropostaPDF

- Gerar tabela detalhada com todas as parcelas do fluxo de pagamento
- Cada linha: tipo, valor, parcelas, descricao, indice

### 5. Atualizar hook use-propostas

- Ao criar proposta, inserir tambem as parcelas na tabela proposta_parcelas
- Ao buscar propostas, buscar tambem as parcelas associadas
- Atualizar PropostaInsert para incluir array de parcelas

### 6. Campos que permanecem na tabela propostas

Os campos `valor_entrada`, `forma_pagamento_entrada`, `parcelamento` continuam existindo no banco para retrocompatibilidade, mas o modal novo usara a tabela `proposta_parcelas` como fonte principal. O campo `valor_proposta` continua sendo o valor total.

---

## Secao Tecnica

### Migracao SQL

```text
CREATE TABLE public.proposta_parcelas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrada',
  valor numeric NOT NULL,
  quantidade_parcelas integer,
  valor_parcela numeric,
  descricao text,
  indice_correcao text,
  observacao text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.proposta_parcelas ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access proposta_parcelas"
  ON public.proposta_parcelas FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Corretores: via join com propostas -> leads
CREATE POLICY "Corretores select proposta_parcelas"
  ON public.proposta_parcelas FOR SELECT
  USING (has_role(auth.uid(), 'broker') AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

CREATE POLICY "Corretores insert proposta_parcelas"
  ON public.proposta_parcelas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'broker') AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

CREATE POLICY "Corretores delete proposta_parcelas"
  ON public.proposta_parcelas FOR DELETE
  USING (has_role(auth.uid(), 'broker') AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

-- Lideres
CREATE POLICY "Lideres select proposta_parcelas"
  ON public.proposta_parcelas FOR SELECT
  USING (has_role(auth.uid(), 'leader') AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id IN (
        SELECT id FROM brokers WHERE lider_id = get_my_broker_id()
      )
    )
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.proposta_parcelas;
```

### Arquivos modificados
1. `src/hooks/use-propostas.ts` - Adicionar tipo ParcelaInsert, buscar parcelas junto com propostas, inserir parcelas ao criar
2. `src/components/crm/PropostaModal.tsx` - Reformular completamente a secao financeira com lista dinamica de parcelas
3. `src/components/crm/PropostasList.tsx` - Exibir parcelas no card expandido
4. `src/components/crm/PropostaPDF.tsx` - Gerar tabela de parcelas no PDF

### Fluxo no modal

```text
[Valor Total da Proposta: R$ 500.000,00]

Fluxo de Pagamento:
+--------------------------------------------------+
| Tipo: Entrada (parcelada)  | Valor: R$ 100.000   |
| 10x de R$ 10.000           |                      |
+--------------------------------------------------+
| Tipo: Dacao em Pagamento   | Valor: R$ 220.000   |
| Descricao: Terreno em Estancia Velha             |
+--------------------------------------------------+
| Tipo: Financiamento        | Valor: R$ 180.000   |
| 100x | Indice: INCC                               |
| Obs: 6 reforcos semestrais de R$ 10.000          |
+--------------------------------------------------+
           [+ Adicionar Parcela]

Resumo:
  Total Proposta: R$ 500.000
  Total Composto: R$ 500.000  (checkmark verde)
  Diferenca: R$ 0,00
```
