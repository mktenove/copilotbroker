

# Rota provisoria para visualizar a pagina completa

## Alteracao

Adicionar uma rota temporaria `/estanciavelha/privado` no `src/App.tsx` que renderiza o componente `EstanciaVelha` (pagina completa em backup), sem alterar nenhuma outra rota existente.

### `src/App.tsx`

1. Descomentar o import de `EstanciaVelha`:
```tsx
import EstanciaVelha from "./pages/EstanciaVelha";
```

2. Adicionar a rota antes das rotas dinamicas:
```tsx
<Route path="/estanciavelha/privado" element={<EstanciaVelha />} />
```

A rota precisa ficar **antes** de `/estanciavelha/:brokerSlug` para nao ser capturada como brokerSlug.

Nenhum outro arquivo sera alterado. Voce podera acessar pelo preview em `/estanciavelha/privado`.

