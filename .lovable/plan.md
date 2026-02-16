

# Corrigir barra inferior "solta" no iPhone

## Problema
A classe `pb-safe` usada nos componentes `BrokerBottomNav` e `MobileBottomNav` para aplicar padding inferior respeitando a safe area do iPhone **nao existe no CSS**. Apenas `pt-safe` e `top-safe` foram definidas em `src/index.css`. Resultado: no iPhone, a barra de navegacao inferior nao respeita o home indicator e fica "solta" ou com conteudo por tras dela.

## Solucao

**Arquivo:** `src/index.css` (linha ~259, junto com `pt-safe` e `top-safe`)

Adicionar a classe utilitaria `pb-safe`:

```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

Isso faz com que a barra inferior ganhe o padding correto em iPhones com home indicator (notch/dynamic island), colando ela na base da tela. Em dispositivos sem safe area, nada muda (fallback 0px).

## Impacto
- `BrokerBottomNav.tsx` -- ja usa `pb-safe`, vai funcionar automaticamente
- `MobileBottomNav.tsx` -- ja usa `pb-safe`, vai funcionar automaticamente
- Nenhum outro arquivo precisa ser alterado

