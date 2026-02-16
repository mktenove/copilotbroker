
# Reativar Lead Inativo

## O que sera feito

Adicionar a funcao de reativar leads inativos, permitindo que corretores, lideres e admins possam reativar um lead que foi previamente inativado. O lead voltara ao status "new" (Novo) e ficara visivel novamente no Kanban e na lista de leads.

## Mudancas

### 1. Hook `src/hooks/use-kanban-leads.ts`

Adicionar funcao `reactivateLead(leadId)` que:
- Atualiza o status do lead para "new"
- Limpa os campos `inactivation_reason`, `inactivated_at`, `data_perda`, `etapa_perda`
- Registra uma interacao do tipo "reactivation" na tabela `lead_interactions`
- Atualiza o estado local

### 2. Pagina do Lead `src/pages/LeadPage.tsx`

Na secao "Lead Perdido" (quando `isLost === true`), adicionar um botao "Reativar Lead" com icone de RotateCw. Ao clicar, chama `reactivateLead` e atualiza a pagina.

Visualmente:
```text
[icone UserX]
Lead Perdido
Motivo: lead_duplicado

[ Reativar Lead ]
```

### 3. Card na lista `src/components/admin/LeadCard.tsx`

Quando o lead estiver inativo e `onInactivate` estiver disponivel (indicando que o usuario tem permissao), mostrar um botao "Reativar" no lugar do botao "Inativar". Adicionar prop `onReactivate`.

### 4. Tabela de leads `src/components/admin/LeadsTable.tsx`

Adicionar prop `onReactivate` e exibir botao de reativacao na coluna de acoes para leads inativos.

### 5. Pagina Admin `src/pages/Admin.tsx`

Passar a funcao `onReactivate` para o `LeadsTable`, chamando a logica de reativacao.

## Sem mudancas no banco de dados

O tipo `lead_interactions.interaction_type` ja aceita valores dinamicos via cast. Nenhuma migracao necessaria -- apenas atualizacao do status do lead e registro de interacao.

## Arquivos

| Acao | Arquivo |
|------|---------|
| Editar | `src/hooks/use-kanban-leads.ts` |
| Editar | `src/pages/LeadPage.tsx` |
| Editar | `src/components/admin/LeadCard.tsx` |
| Editar | `src/components/admin/LeadsTable.tsx` |
| Editar | `src/pages/Admin.tsx` |
