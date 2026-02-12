
## Adicionar botao para excluir roleta

### Objetivo
Permitir que o admin exclua uma roleta diretamente pela interface de gerenciamento.

### Mudancas necessarias

**1. Migracao de banco de dados**

Duas foreign keys referenciam a tabela `roletas` com `NO ACTION`, o que impede a exclusao:
- `roletas_log.roleta_id` -- sera alterada para `ON DELETE CASCADE` (logs perdem sentido sem a roleta)
- `leads.roleta_id` -- sera alterada para `ON DELETE SET NULL` (leads devem ser preservados)

As demais FKs (`roletas_membros`, `roletas_empreendimentos`) ja possuem `ON DELETE CASCADE`.

**2. Hook `src/hooks/use-roletas.ts`**

Adicionar funcao `deleteRoleta(id: string)`:
- Executa `supabase.from("roletas").delete().eq("id", id)`
- Exibe toast de sucesso/erro
- Chama `fetchRoletas()` para atualizar a lista

**3. Componente `src/components/admin/RoletaManagement.tsx`**

- Adicionar botao "Excluir" (vermelho, com icone Trash2) na area de acoes da roleta expandida, ao lado dos botoes "Desativar" e "Logs"
- Usar um `AlertDialog` para confirmar a exclusao antes de executar, exibindo o nome da roleta e avisando que a acao e irreversivel
- Chamar `deleteRoleta(roleta.id)` ao confirmar
- Se a roleta excluida estava expandida, limpar o estado `expandedRoleta`

### Layout do botao

O botao aparecera na area de acoes existente (linha 299-321), junto com "Desativar" e "Logs":

```text
[Desativar]  [Logs]  [Excluir]
```

Ao clicar em "Excluir", um dialog de confirmacao aparece:

```text
+----------------------------------+
| Excluir Roleta                   |
+----------------------------------+
| Tem certeza que deseja excluir   |
| a roleta "GoldenView"?          |
| Esta acao e irreversivel.        |
|                                  |
| [Cancelar]  [Excluir]           |
+----------------------------------+
```
