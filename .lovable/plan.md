

# Meta Pixel + API de Conversao para /portao/goldenview

## Resumo

Instalar o Meta Pixel (ID `880409748241568`) e integrar a API de Conversoes do Meta somente na pagina GoldenView. O Pixel rastreara PageView e Lead (no formulario). A API de Conversoes enviara eventos server-side para maior precisao.

## Alteracoes

### 1. Armazenar o token da API de Conversao como secret

- Adicionar secret `META_CONVERSIONS_API_TOKEN` com o valor fornecido
- Sera usado pela funcao backend para enviar eventos server-side

### 2. Criar funcao backend `meta-conversions-api`

- Nova edge function em `supabase/functions/meta-conversions-api/index.ts`
- Recebe dados do lead (nome, telefone, event_name, source_url, fbp, fbc)
- Envia evento para `https://graph.facebook.com/v21.0/880409748241568/events`
- Usa o token da API de Conversao armazenado como secret
- Eventos suportados: `Lead`

### 3. Adicionar Meta Pixel no `GoldenViewLandingPage.tsx`

- Inserir o script do Pixel (`fbq`) via `<Helmet>` com:
  - `fbq('init', '880409748241568')`
  - `fbq('track', 'PageView')`
- Apenas nesta pagina, sem afetar outras rotas

### 4. Disparar evento Lead no `GVFormSection.tsx`

- Apos submit com sucesso do formulario:
  - Client-side: `fbq('track', 'Lead')` para o Pixel
  - Server-side: chamar a funcao backend `meta-conversions-api` com os dados do lead para a API de Conversoes
  - Passar cookies `_fbp` e `_fbc` (se disponiveis) para deduplicacao

### 5. Declaracao de tipo para `fbq`

- Adicionar tipo global para `window.fbq` em `src/types/fbq.d.ts`

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/meta-conversions-api/index.ts` | Criar |
| `src/pages/goldenview/GoldenViewLandingPage.tsx` | Editar (adicionar script Pixel no Helmet) |
| `src/components/goldenview/GVFormSection.tsx` | Editar (disparar Lead event client + server) |
| `src/types/fbq.d.ts` | Criar (tipo global fbq) |

## Seguranca

- O token da API de Conversao fica armazenado como secret no backend, nunca exposto no frontend
- O Pixel ID e publico (normal, aparece no HTML de qualquer site que usa Meta Pixel)

