

# Tirar temporariamente a landing page de Estância Velha do ar

## Abordagem

A forma mais simples e reversivel é redirecionar todas as rotas de Estância Velha para a Home (`/`). Assim, quem acessar `/estanciavelha` ou `/estanciavelha/:brokerSlug` será redirecionado automaticamente, sem perder nenhum código.

## Alteracoes

### 1. `src/App.tsx`
- Substituir as rotas de Estância Velha por redirecionamentos:

```tsx
// Antes:
<Route path="/estanciavelha" element={<EstanciaVelha />} />
<Route path="/estanciavelha/:brokerSlug" element={<BrokerLandingPage />} />

// Depois:
<Route path="/estanciavelha" element={<Navigate to="/" replace />} />
<Route path="/estanciavelha/:brokerSlug" element={<Navigate to="/" replace />} />
```

- Remover os imports de `EstanciaVelha` e `BrokerLandingPage` (opcional, nao causa erro se mantidos).

### 2. `public/sitemap.xml`
- Remover a entrada de `/estanciavelha` para que o Google nao tente indexar uma pagina que agora redireciona.

## Para reativar
Basta reverter as duas alteracoes: trocar o `Navigate` de volta pelos componentes originais e readicionar a URL no sitemap.

