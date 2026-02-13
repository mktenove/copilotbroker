

## Substituir emojis de bandeira por imagens reais

### Problema
Os emojis de bandeira (como 🇧🇷) nao renderizam corretamente em muitos navegadores e sistemas operacionais, especialmente Windows. Em vez da bandeira, aparece apenas o texto "BR". Por isso o usuario ve "BR +55" sem nenhuma bandeira visual.

### Solucao
Substituir os emojis por imagens de bandeiras reais usando o CDN publico `flagcdn.com`, que fornece imagens de bandeiras de todos os paises em formato PNG otimizado.

### Como vai ficar
O botao do seletor mostrara uma pequena imagem da bandeira (20x15px) ao lado do codigo do pais, garantindo que funcione em qualquer navegador e sistema operacional.

### Detalhes tecnicos

**Arquivo: `src/components/ui/whatsapp-input.tsx`**

1. Alterar a constante `COUNTRIES` para trocar o campo `flag` (emoji) por `flagCode` (codigo ISO de 2 letras minusculas usado pelo CDN):
   - Brasil: `br`, EUA: `us`, Portugal: `pt`, Argentina: `ar`, etc.

2. Substituir os `<span>` que exibem o emoji por tags `<img>` apontando para `https://flagcdn.com/w20/{flagCode}.png`

3. Aplicar estilo na imagem: `w-5 h-auto rounded-sm` para manter proporcao e visual limpo

4. Atualizar tanto o botao do seletor (trigger) quanto os itens da lista do popover

**Mudancas especificas:**

Constante COUNTRIES - trocar `flag: "🇧🇷"` por `flagCode: "br"`, e assim para todos os paises.

No trigger do Popover e nos itens da lista, trocar:
```
<span className="text-base leading-none">{selectedCountry.flag}</span>
```
Por:
```
<img src={`https://flagcdn.com/w20/${selectedCountry.flagCode}.png`} alt={selectedCountry.name} className="w-5 h-auto rounded-sm" />
```

Nenhuma outra mudanca necessaria. Funcoes de formatacao e validacao permanecem iguais.

