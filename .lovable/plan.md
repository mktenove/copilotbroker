
# Plano: Corrigir Informações dos Apartamentos

## Objetivo

Atualizar as características dos apartamentos na seção `MCApartmentsSection` para refletir as informações corretas fornecidas.

## Mudanças Necessárias

### Arquivo a Modificar
`src/components/mauriciocardoso/MCApartmentsSection.tsx`

### Dados Atuais vs Corretos

| Tipo | Atual | Correto |
|------|-------|---------|
| **2 Dormitórios** | Suíte master, Living ampliado, Varanda gourmet | 2 suítes, Living integrado, Sacada |
| **3 Dormitórios** | 2 suítes, Home office, Varanda integrada | 1 suíte plena + 2 demi suítes, Living integrado, Sacada |

### Alteração no Código

Atualizar o array `apartments` nas linhas 4-17:

```typescript
const apartments = [
  {
    type: "2 Dormitórios",
    area: "95 m²",
    description: "Ideal para casais contemporâneos que valorizam espaço e funcionalidade",
    features: ["2 suítes", "Living integrado", "Sacada"],
  },
  {
    type: "3 Dormitórios",
    area: "125 m²",
    description: "Perfeito para famílias que buscam conforto sem abrir mão da localização",
    features: ["1 suíte plena + 2 demi suítes", "Living integrado", "Sacada"],
  },
];
```

## Resultado Esperado

Os cards de apartamentos exibirão as características corretas conforme especificado pelo cliente.
