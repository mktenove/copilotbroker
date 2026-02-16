
# Abrir pagina do lead ao clicar na lista (remover formulario antigo)

## O que sera feito

Quando o usuario clica em um lead na aba "Leads" (lista/tabela), em vez de abrir o `LeadDetailSheet` (formulario lateral antigo), o sistema vai navegar para a pagina dedicada do lead (`/corretor/lead/:id`).

## Mudancas

### Arquivo: `src/pages/Admin.tsx`

1. **Alterar `handleLeadClick`** (linhas 223-253): Em vez de converter o lead para CRMLead e abrir o sheet, simplesmente navegar para `/corretor/lead/${lead.id}`

2. **Remover estado `selectedLead`** (linha 70): Nao sera mais necessario

3. **Remover `LeadDetailSheet`** (linhas 574-581): Remover o componente e seu import

4. **Remover funcoes orfas**: `handleUpdateLead` e `handleStatusChange` que so eram usadas pelo LeadDetailSheet

5. **Limpar imports**: Remover `LeadDetailSheet` e `CRMLead` se nao forem mais usados

### Arquivo: `src/components/admin/LeadCard.tsx`

Atualizar o componente para que, quando receber `onClick`, navegue para a pagina do lead. Nenhuma mudanca necessaria aqui pois o `onClick` ja e passado pelo `LeadsTable` via `onLeadClick`.

### Sem mudancas no banco de dados
Apenas logica de navegacao no frontend.
