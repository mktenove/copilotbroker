

## Tornar o codigo de pais editavel no campo WhatsApp com bandeira

### O que muda
O campo de WhatsApp atualmente forca o prefixo +55 (Brasil) sem possibilidade de alteracao. Vamos transformar o componente `WhatsAppInput` para incluir um seletor de codigo de pais com bandeira, permitindo ao usuario escolher outro pais se necessario, mantendo o Brasil como padrao.

### Como vai ficar
O campo tera duas partes lado a lado:
1. Um botao/seletor a esquerda mostrando a bandeira do pais + codigo (ex: flag BR +55)
2. O campo de input do numero a direita, formatando conforme o pais selecionado

### Detalhes tecnicos

**Arquivo: `src/components/ui/whatsapp-input.tsx`**

- Adicionar uma lista dos codigos de pais mais comuns (Brasil, EUA, Portugal, Argentina, etc.) com emoji de bandeira
- Substituir o prefixo fixo "55" por um estado `countryCode` selecionavel via Popover/Select
- O seletor mostra a bandeira emoji + codigo do pais (ex: "BR +55")
- Ao trocar o pais, o raw value e atualizado automaticamente com o novo prefixo
- A formatacao de display se adapta: para Brasil, manter o formato (XX) XXXXX-XXXX; para outros paises, exibir os numeros sem mascara especifica
- A validacao `isValidBrazilianWhatsApp` continua funcionando para o caso brasileiro, mas nao bloqueia outros paises

**Arquivo: `src/components/admin/AddLeadModal.tsx`**

- A validacao de 13 digitos na submissao sera ajustada para aceitar numeros com tamanho variavel (minimo 10 digitos total incluindo codigo do pais)

**Paises incluidos no seletor:**
- Brasil (+55), Estados Unidos (+1), Portugal (+351), Argentina (+54), Uruguai (+598), Paraguai (+595), Chile (+56), Colombia (+57), Mexico (+52)

**Visual:** Usa um Popover com lista de paises, estilizado no tema escuro do modal, com emojis de bandeira para identificacao rapida.
