
# Plano: Correção de RLS e Melhoria do Gerenciamento de Empreendimentos para Corretores

## Diagnóstico do Problema

### Problema 1: Empreendimento não aparece após habilitar
A corretora Samyra habilitou o empreendimento "Mauricio Cardoso" (Novo Hamburgo), mas ele **não foi salvo no banco de dados**.

**Causa raiz**: A tabela `broker_projects` possui RLS ativo, mas **faltam políticas de INSERT e UPDATE** para corretores:

| Política Atual | Comando | Quem pode |
|----------------|---------|-----------|
| Admins gerenciam associações | ALL | Apenas admins |
| Corretores veem suas associações | SELECT | Corretores (só leitura) |

Quando um corretor tenta adicionar um empreendimento via `useBrokerProjects.addProject()`, a inserção é **bloqueada silenciosamente** pela RLS.

### Problema 2: Interface de gerenciamento confusa
A página inicial do corretor (`BrokerAdmin.tsx`) mostra todos os links de empreendimentos diretamente, o que ficará confuso com muitos projetos.

## Solução Proposta

### Parte 1: Corrigir RLS da tabela `broker_projects`

Adicionar políticas que permitam corretores gerenciarem suas próprias associações:

```sql
-- Corretores podem adicionar empreendimentos para si mesmos
CREATE POLICY "Corretores podem criar suas associações"
ON public.broker_projects FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);

-- Corretores podem atualizar suas próprias associações (ativar/desativar)
CREATE POLICY "Corretores podem atualizar suas associações"
ON public.broker_projects FOR UPDATE
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);
```

### Parte 2: Melhorar a Interface de Gerenciamento

**Mudanças na página `BrokerAdmin.tsx`:**
- Mostrar apenas um **resumo compacto** (máx. 2 projetos) com link para "Ver todos"
- Remover os botões de copiar/abrir de cada projeto (ficam apenas na página de gerenciamento)
- Adicionar indicador visual de quantos empreendimentos estão ativos

**Mudanças na página `BrokerProjects.tsx`:**
- Melhorar a organização visual com cards mais compactos
- Adicionar filtro/busca quando houver muitos projetos
- Mostrar preview do link de forma mais elegante
- Adicionar ação de "Copiar todos os links"

### Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| Migration SQL | Criar | Adicionar políticas RLS de INSERT e UPDATE para corretores |
| `src/pages/BrokerAdmin.tsx` | Modificar | Simplificar card de empreendimentos (resumo compacto) |
| `src/pages/BrokerProjects.tsx` | Modificar | Melhorar UX da página de gerenciamento |
| `src/hooks/use-broker-projects.ts` | Modificar | Adicionar tratamento de erro mais específico para RLS |

## Detalhes Técnicos

### Migration SQL para RLS

```sql
-- Política para INSERT
CREATE POLICY "Corretores podem criar suas associações"
ON public.broker_projects FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);

-- Política para UPDATE
CREATE POLICY "Corretores podem atualizar suas associações"
ON public.broker_projects FOR UPDATE
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
)
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);
```

### Nova Interface do BrokerAdmin

O card de "Seus Links de Captação" será simplificado para:

```text
┌─────────────────────────────────────────────┐
│ 🏢 Seus Empreendimentos                     │
│                                             │
│ ● 3 empreendimentos ativos                  │
│                                             │
│ [Gerenciar Empreendimentos →]               │
└─────────────────────────────────────────────┘
```

### Nova Interface do BrokerProjects

Estrutura melhorada com:

```text
┌─────────────────────────────────────────────┐
│ Meus Empreendimentos                        │
│ 3 ativos                      [+ Adicionar] │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ GoldenView           Portão             │ │
│ │ /portao/goldenview/samyra-saltiel       │ │
│ │ [📋 Copiar] [🔗 Abrir] [🗑️ Remover]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Mauricio Cardoso     Novo Hamburgo      │ │
│ │ /novohamburgo/mauriciocardoso/samyra... │ │
│ │ [📋 Copiar] [🔗 Abrir] [🗑️ Remover]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ O Novo Condomínio    Estância Velha     │ │
│ │ /estanciavelha/samyra-saltiel           │ │
│ │ [📋 Copiar] [🔗 Abrir] [🗑️ Remover]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│ 🔗 Seu Link Personalizado                   │
│ samyra-saltiel                    [Salvar]  │
│ (usado em todos os empreendimentos)         │
└─────────────────────────────────────────────┘
```

## Resultado Esperado

1. **Samyra poderá adicionar empreendimentos** - A RLS permitirá INSERT
2. **Empreendimentos aparecerão corretamente** - O banco salvará as associações
3. **Interface mais limpa** - Dashboard principal focado em leads
4. **Gerenciamento dedicado** - Página específica para empreendimentos
5. **Escalável** - Funciona bem com 1 ou 20 empreendimentos

## Ordem de Implementação

1. **Migração SQL** - Corrigir RLS (resolve o bug imediatamente)
2. **BrokerAdmin.tsx** - Simplificar card de empreendimentos
3. **BrokerProjects.tsx** - Melhorar página de gerenciamento
4. **use-broker-projects.ts** - Melhorar tratamento de erros
