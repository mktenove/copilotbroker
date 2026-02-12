
# Corrigir lista de corretores no formulário GoldenView

## Problema
A consulta para buscar corretores associados ao projeto usa a tabela `broker_projects`, que possui politicas de seguranca (RLS) restritas a admins e corretores autenticados. Como a landing page e publica (sem login), a consulta retorna vazio e nenhum corretor aparece na lista.

A tabela `brokers` ja possui uma politica publica ("Qualquer pessoa pode ver corretores ativos"), mas `broker_projects` nao tem politica equivalente para leitura publica.

## Solucao
Adicionar uma politica de leitura publica na tabela `broker_projects` para associacoes ativas, permitindo que visitantes da landing page vejam quais corretores estao vinculados ao projeto.

## Alteracoes

### 1. Migracaco de banco de dados
Criar uma nova politica RLS na tabela `broker_projects`:

```sql
CREATE POLICY "Associacoes ativas sao publicas"
  ON public.broker_projects
  FOR SELECT
  USING (is_active = true);
```

Isso segue o mesmo padrao ja usado na tabela `brokers` ("Qualquer pessoa pode ver corretores ativos") e na tabela `projects` ("Projetos ativos sao publicos").

### 2. Nenhuma alteracao de codigo necessaria
O componente `GVFormSection` ja faz a consulta correta — o unico bloqueio era a falta de permissao no banco de dados. Com a nova politica, a lista de corretores aparecera automaticamente.

## Seguranca
- A politica expoe apenas associacoes ativas (`is_active = true`)
- Apenas leitura (SELECT) — nenhuma operacao de escrita e permitida publicamente
- Os dados expostos sao minimos: apenas o vinculo corretor-projeto, sem informacoes sensiveis
