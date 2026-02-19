

# Corrigir autocomplete do navegador no campo WhatsApp

## Problema

Quando o navegador usa autocomplete para preencher o campo de telefone, ele insere o numero completo com codigo do pais (ex: `5511999998888`). Como o seletor de pais ja esta em +55, o componente trata esses digitos como numero local e aplica o limite de 11 digitos locais, resultando em `55119999988` — que inclui o "55" como parte do numero local e perde os 2 ultimos digitos.

## Solucao

Detectar automaticamente quando o valor digitado/colado/autocompletado no campo local comeca com o codigo do pais selecionado e tem comprimento compativel com um numero completo. Nesse caso, remover o prefixo duplicado antes de processar.

## Alteracao

### `src/components/ui/whatsapp-input.tsx`

Na funcao `handleLocalChange`, adicionar logica de deteccao antes do trim:

```typescript
const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let digits = e.target.value.replace(/\D/g, "");
  const code = selectedCountry.code;
  const maxLocal = selectedCountry.maxDigits - code.length;

  // Autocomplete do navegador pode inserir o numero completo com codigo do pais.
  // Se os digitos comecam com o codigo do pais E excedem o tamanho local maximo,
  // removemos o prefixo duplicado.
  if (digits.startsWith(code) && digits.length > maxLocal) {
    digits = digits.slice(code.length);
  }

  const trimmed = digits.slice(0, maxLocal);
  setLocalNumber(trimmed);
  onChange(code + trimmed);
};
```

**Exemplo pratico:**
- Autocomplete insere: `5511999998888` (13 digitos)
- `maxLocal = 11`, digitos comecam com "55" e tem 13 > 11
- Remove prefixo: `11999998888` (11 digitos) - numero local correto
- Valor final emitido: `5511999998888` - numero completo correto

**Caso seguro:** Se o usuario digita manualmente `11999998888` (11 digitos, comeca com "11"), a condicao `digits.length > maxLocal` e falsa (11 nao e > 11), entao nenhuma remocao acontece.

Nenhuma outra alteracao necessaria — o fix e isolado na funcao de input do componente.

