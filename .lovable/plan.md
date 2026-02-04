
# Plano: Adicionar Botão para Editar Templates Padrão

## Contexto
Atualmente, os templates padrão (com `broker_id = null`) não mostram botões de edição porque a condição verifica apenas se o template pertence ao corretor atual. Precisamos permitir que **administradores** também possam editar e excluir templates padrão.

## Alterações Necessárias

### Arquivo: `src/components/whatsapp/TemplatesSheet.tsx`

**Modificações:**
1. Importar o hook `useUserRole` para verificar se o usuário é admin
2. Alterar a condição de exibição dos botões de editar/excluir:
   - **Antes:** `template.broker_id === broker?.id`
   - **Depois:** `template.broker_id === broker?.id || (isAdmin && template.broker_id === null)`

## Detalhes Técnicos

```typescript
// Adicionar import
import { useUserRole } from "@/hooks/use-user-role";

// Dentro do componente
const { role } = useUserRole();
const isAdmin = role === "admin";

// Nova condição para mostrar botões
{(template.broker_id === broker?.id || (isAdmin && template.broker_id === null)) && (
  <div className="flex items-center gap-1">
    {/* Botões de Edit e Delete */}
  </div>
)}
```

## Comportamento Esperado

| Usuário | Template Próprio | Template Padrão |
|---------|------------------|-----------------|
| Corretor | Editar/Excluir | Apenas visualizar |
| Admin | Editar/Excluir | Editar/Excluir |

## Observação
As políticas RLS no banco de dados já permitem que admins atualizem e deletem templates globais, então não é necessária nenhuma alteração no backend.
