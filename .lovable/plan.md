
# Fix: Pagina do Corretor nao renderiza conteudo em producao

## Problema

A pagina `/estanciavelha/:brokerSlug` mostra apenas o header e um fundo escuro -- sem titulo, texto ou formulario. O conteudo existe mas esta invisivel.

## Causa Raiz

Ha um problema de **timing entre o IntersectionObserver e o estado de loading**:

1. O componente monta e o `useEffect` do observer roda imediatamente
2. Nesse momento, `loading = true`, entao o componente renderiza o **spinner** (nao o hero)
3. O `heroRef.current` e `null` -- o observer nao observa nada
4. Quando o loading termina e o hero renderiza com `heroRef`, o observer ja executou e nao re-executa
5. `visibleItems` permanece `0`, e todos os elementos ficam com `opacity-0 translate-y-8` -- invisiveis

No preview do Lovable funciona por causa de hot-reload e cache, mas em producao com uma visita limpa o bug aparece.

## Solucao

### `src/pages/EstanciaVelhaBrokerTeaser.tsx`

Adicionar `loading` como dependencia do `useEffect` do IntersectionObserver para que ele re-execute apos o loading terminar e o heroRef estar disponivel no DOM:

```tsx
useEffect(() => {
  if (loading) return; // Esperar loading terminar

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setVisibleItems(count);
          if (count >= 6) clearInterval(interval);
        }, 200);
      }
    },
    { threshold: 0.1 }
  );
  if (heroRef.current) observer.observe(heroRef.current);
  return () => observer.disconnect();
}, [loading]); // <-- adicionar dependencia
```

Apenas essa alteracao de 2 linhas resolve o problema. Nenhum outro arquivo precisa ser alterado.
