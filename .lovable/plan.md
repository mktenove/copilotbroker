
# Plano: Atualizar Mensagem Padrão de Automação

## Objetivo

Trocar o texto padrão exibido ao criar uma nova regra de automação de WhatsApp.

---

## Alteração Necessária

### Arquivo: `src/types/auto-message.ts`

**Substituir o valor da constante `DEFAULT_AUTO_MESSAGE`:**

```typescript
// ANTES
export const DEFAULT_AUTO_MESSAGE = `Olá {nome_lead}! 👋

Sou {nome_corretor}, da Enove Incorporadora.
Vi que você tem interesse no {empreendimento}!

Posso te enviar mais informações?`;

// DEPOIS
export const DEFAULT_AUTO_MESSAGE = `Oi {nome_lead}, tudo bem? 👋
Aqui é {nome_corretor}, da Enove Imobiliária!

Vi agora o seu cadastro para fazer parte da lista VIP do *novo condomínio de Estância Velha* e já quis te chamar pra te explicar com calma como vai funcionar! Foi você mesmo que se cadastrou?`;
```

---

## Observação

A nova mensagem usa formatação de negrito do WhatsApp (`*texto*`) para destacar "novo condomínio de Estância Velha". Isso funcionará corretamente quando enviado via WhatsApp.

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/types/auto-message.ts` | Atualizar texto de `DEFAULT_AUTO_MESSAGE` |

---

## Resultado Esperado

Ao clicar em "Nova Regra" na aba Automação, o campo de mensagem virá preenchido com o novo texto padrão.
