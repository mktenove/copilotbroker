

# Aplicar fix de autocomplete em todos os formularios de landing page

## Problema

O fix de autocomplete do navegador foi aplicado apenas no componente `WhatsAppInput`. Porem, dois formularios importantes usam um campo `<input>` simples com uma funcao `formatWhatsApp` local, e portanto continuam vulneraveis ao problema de perda de digitos:

1. **`src/components/FormSection.tsx`** -- usado em Estancia Velha, Prontos e projetos dinamicos (todas as landing pages com broker e sem broker)
2. **`src/components/goldenview/GVFormSection.tsx`** -- usado nas landing pages do GoldenView

## Solucao

Migrar ambos os formularios para usar o componente `WhatsAppInput` no lugar do `<input>` manual. Isso garante que:
- O fix de autocomplete funcione em todos os formularios
- Leads internacionais possam se cadastrar com seletor de pais
- A validacao fique centralizada e consistente

## Alteracoes

### 1. `src/components/FormSection.tsx`

- Remover a funcao local `formatWhatsApp`
- Importar `WhatsAppInput` e `isValidBrazilianWhatsApp` de `@/components/ui/whatsapp-input`
- Substituir o `<input type="tel">` pelo componente `<WhatsAppInput>`
- Atualizar a validacao de submit para usar `isValidWhatsApp` (aceitar internacionais) ou `isValidBrazilianWhatsApp`
- Ajustar o estado `formData.whatsapp` para armazenar apenas digitos (sem formatacao), pois o `WhatsAppInput` ja gerencia a formatacao internamente

### 2. `src/components/goldenview/GVFormSection.tsx`

- Mesmas alteracoes do FormSection acima
- Remover a funcao local `formatWhatsApp`
- Importar e usar `WhatsAppInput`
- Ajustar validacao e estado

### Detalhes tecnicos

O `WhatsAppInput` emite o valor como string de digitos puros com codigo do pais (ex: `5511999998888`), enquanto os formularios atuais armazenam com formatacao `(11) 99999-8888`. As mudancas necessarias:

```typescript
// Antes (FormSection.tsx)
const formatWhatsApp = (value: string) => { ... };
// <input onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })} />

// Depois
import { WhatsAppInput, isValidWhatsApp } from "@/components/ui/whatsapp-input";
// <WhatsAppInput value={formData.whatsapp} onChange={(val) => setFormData({ ...formData, whatsapp: val })} />
```

A validacao de submit tambem sera atualizada:

```typescript
// Antes
if (formData.whatsapp.replace(/\D/g, "").length < 10) { ... }

// Depois
if (!isValidWhatsApp(formData.whatsapp)) { ... }
```

Sera necessario ajustar o estilo do `WhatsAppInput` em cada formulario para manter a aparencia visual atual (classes de cor, borda, etc via prop `className`).

Nenhuma alteracao de banco de dados necessaria -- o campo `whatsapp` na tabela `leads` ja armazena apenas digitos.
