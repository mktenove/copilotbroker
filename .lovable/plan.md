

# Remover frase do Hero do GoldenView

Remover o paragrafo "Em breve, Portão vai viver o maior e mais desejado lançamento imobiliário da sua história recente." da secao hero para deixar o visual mais limpo.

## Alteracao

**Arquivo:** `src/components/goldenview/GVHeroSection.tsx`

Remover as linhas 67-69 que contem:

```tsx
<p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 max-w-2xl mx-auto leading-relaxed">
  Em breve, Portão vai viver o maior e mais desejado lançamento imobiliário da sua história recente.
</p>
```

Nenhuma outra alteracao necessaria. Apenas 1 arquivo, 3 linhas removidas.

