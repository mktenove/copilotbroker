
# Correção do Botão "Remover Instância" - WhatsApp Global

## Resumo do Problema

O botão "Remover Instância" não funciona devido a dois problemas:

1. **Erro de CORS**: A edge function não permite o método DELETE nas requisições HTTP, causando "Failed to fetch" no navegador
2. **API UAZAPI não suporta deleção**: A API UAZAPI não possui endpoint para deletar/destruir uma instância - apenas desconectar

## Solução Proposta

Como a UAZAPI não suporta remoção de instâncias (apenas desconexão), vamos:

1. **Renomear a funcionalidade** para "Desconectar e Limpar Sessão" ou similar - refletindo o que realmente acontece
2. **Alterar para usar POST** em vez de DELETE - evitando problemas de CORS e alinhando com a API UAZAPI
3. **Usar o endpoint `/instance/disconnect`** que já existe e funciona

---

## Detalhes Técnicos

### 1. Edge Function (`whatsapp-global-instance-manager`)

**Problema atual:**
- CORS headers não incluem DELETE
- Endpoints `/instance/delete` e `/instance/destroy` não existem na UAZAPI

**Correção:**
- Remover a rota DELETE `/delete`
- Criar rota POST `/clear-session` que apenas chama `/instance/disconnect`
- Atualizar CORS headers para consistencia

### 2. Hook (`use-whatsapp-global-instance`)

**Correção:**
- Renomear `deleteInstance` para `clearSession`
- Alterar de DELETE para POST
- Atualizar o endpoint para `/clear-session`

### 3. Componente (`GlobalConnectionTab`)

**Correção:**
- Renomear botao de "Remover Instância" para "Limpar Sessão"
- Atualizar textos do dialog de confirmacao
- Chamar `clearSession` em vez de `deleteInstance`

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/whatsapp-global-instance-manager/index.ts` | Substituir DELETE `/delete` por POST `/clear-session` |
| `src/hooks/use-whatsapp-global-instance.ts` | Renomear funcao e alterar metodo HTTP |
| `src/components/whatsapp/GlobalConnectionTab.tsx` | Atualizar textos e chamada de funcao |

---

## Resultado Esperado

Apos as alteracoes:
- O botao "Limpar Sessão" ira desconectar a instancia global do WhatsApp
- A interface refletira corretamente que a sessao foi encerrada
- Nenhum erro de CORS ou "Failed to fetch"
- Funcionalidade alinhada com o que a API UAZAPI realmente oferece
