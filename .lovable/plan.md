

# Adicionar Meta Pixel e CAPI ao Mauricio Cardoso

## Resumo

Instalar o Facebook Pixel (ID: 1447260256915517) nas paginas `/novohamburgo/mauriciocardoso` e `/novohamburgo/mauriciocardoso/obrigado`, seguindo o mesmo padrao ja usado no GoldenView: rastreamento hibrido com Pixel client-side + API de Conversoes server-side.

## Alteracoes

### 1. Salvar o token da API de Conversoes

Adicionar um novo segredo `META_CONVERSIONS_API_TOKEN_MC` com o token fornecido. Esse segredo sera usado pela funcao de backend para enviar eventos server-side para o pixel do Mauricio Cardoso.

### 2. Atualizar a funcao de backend `meta-conversions-api`

Atualmente a funcao tem o Pixel ID do GoldenView fixo no codigo. Sera atualizada para aceitar um `pixel_id` opcional no corpo da requisicao, permitindo reusar a mesma funcao para ambos os projetos:

- Se `pixel_id` for enviado e corresponder ao do Mauricio Cardoso, usa o token `META_CONVERSIONS_API_TOKEN_MC`
- Caso contrario, usa o token original `META_CONVERSIONS_API_TOKEN` (GoldenView)
- O fallback do `event_source_url` tambem sera ajustado

### 3. Adicionar script do Pixel na landing page

No componente `MauricioCardosoLandingPage.tsx`, adicionar via Helmet:
- Script de inicializacao do Facebook Pixel (ID 1447260256915517)
- Evento `PageView` automatico
- Tag `noscript` com pixel de imagem

O mesmo script ja carrega na rota `/obrigado` pois usa o mesmo componente.

### 4. Disparar evento Lead no formulario

No `MCFormSection.tsx`, apos o cadastro bem-sucedido:
- Disparar `fbq('track', 'Lead')` client-side
- Chamar `meta-conversions-api` server-side com `pixel_id`, dados do usuario, cookies `_fbp`/`_fbc` e `event_id` para deduplicacao

## Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| Segredo `META_CONVERSIONS_API_TOKEN_MC` | Novo segredo com o token fornecido |
| `supabase/functions/meta-conversions-api/index.ts` | Aceitar `pixel_id` opcional e selecionar token correspondente |
| `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx` | Adicionar script do Pixel no Helmet |
| `src/pages/mauriciocardoso/MauricioCardosoBrokerLandingPage.tsx` | Adicionar script do Pixel no Helmet |
| `src/components/mauriciocardoso/MCFormSection.tsx` | Disparar evento Lead (client + server) apos submit |

