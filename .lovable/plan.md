
# Correção: Iniciar Atendimento abrindo WhatsApp direto no celular

## Problema

O `window.open(url, '_blank')` no celular abre uma nova aba do navegador antes de redirecionar para o WhatsApp. O botão de WhatsApp do Kanban Card funciona porque usa uma tag `<a href>`, que o sistema operacional intercepta e abre direto no app.

## Solução

Substituir `window.open(url, '_blank')` por `window.location.href = url` nos fluxos de Iniciar Atendimento. Isso faz o navegador navegar diretamente para o link `wa.me`, que o celular intercepta e abre o WhatsApp sem abrir uma aba intermediária.

## Arquivos afetados

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/components/crm/KanbanBoard.tsx` | 296 | `window.open(url, '_blank')` para `window.location.href = url` |
| `src/pages/LeadPage.tsx` | 422 | `window.open(url, '_blank')` para `window.location.href = url` |
| `src/components/crm/LeadDetailSheet.tsx` | 393 | `window.open(url, '_blank')` para `window.location.href = url` |

Nota: Os outros links de WhatsApp (enviar mensagem rápida, botão de contato) continuam como estão, pois já funcionam corretamente com `<a href>` ou têm contexto diferente.

## Resultado esperado

Ao clicar em "Iniciar e Enviar via WhatsApp", o WhatsApp abrirá diretamente no celular sem passar por uma aba intermediária do navegador.
