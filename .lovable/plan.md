
# Corrigir botao de voltar na pagina do Lead

## Problema
O botao de voltar navega para `/corretor`, que nao existe como rota. As rotas corretas sao:
- `/admin` para usuarios com role `admin`
- `/corretor/admin` para corretores e lideres

A rota `/corretor` acaba sendo capturada pela rota dinamica `/:citySlug/:projectSlug`, que nao encontra nenhum projeto e resulta em 404.

## Solucao

### Arquivo: `src/pages/LeadPage.tsx`
- Usar o `role` ja disponivel via `useUserRole()` para determinar o destino do botao de voltar
- Se `role === "admin"`: navegar para `/admin`
- Caso contrario: navegar para `/corretor/admin`

### Codigo
Linha 300 alterada de:
```typescript
<button onClick={() => navigate("/corretor")} ...>
```
Para:
```typescript
<button onClick={() => navigate(role === "admin" ? "/admin" : "/corretor/admin")} ...>
```

Alteracao minima de uma unica linha.
