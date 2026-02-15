

# Adicionar Check-out de Corretores por Lideres/Admins

## O que sera feito
Adicionar um botao de check-out ao lado de cada membro com status online na lista de membros da roleta expandida (RoletaManagement.tsx). Lideres e admins poderao forcar o check-out de qualquer corretor diretamente pelo painel de gerenciamento.

## Por que e simples
- A funcao `toggleCheckin` ja existe no hook `use-roletas.ts` e faz o update no banco
- A politica RLS "Admins e leaders gerenciam membros" (comando ALL) ja permite que admins e leaders facam UPDATE na tabela `roletas_membros`
- Nao e necessaria nenhuma alteracao de banco de dados

## Alteracao necessaria

### `src/components/admin/RoletaManagement.tsx`
Na secao de membros da roleta expandida (linhas 460-506), adicionar um botao de check-out (icone LogOut) ao lado de cada membro que esteja com `status_checkin = true`. Ao clicar, chamara `toggleCheckin(membro.id, false)` do hook `useRoletas`.

O botao aparecera entre o botao "Definir como proximo" (Target) e o botao "Remover" (Trash2), apenas para membros online.

### `src/hooks/use-roletas.ts`
Nenhuma alteracao necessaria - a funcao `toggleCheckin` ja existe e funciona corretamente.

