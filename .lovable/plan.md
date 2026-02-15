
# Botões de ação mais evidentes no mobile

## Alteração

### Arquivo: `src/pages/LeadPage.tsx` (linhas 351)

Trocar o container dos botões de `flex items-center gap-2 flex-wrap` para usar layout responsivo:
- **Mobile**: `flex flex-col gap-2` -- cada botão ocupa uma linha inteira, com largura total (`w-full`)
- **Desktop**: mantém o layout horizontal atual (`sm:flex-row sm:w-auto`)

Aumentar a altura dos botões no mobile de `h-9` para `h-11` e o texto de `text-xs` para `text-sm` para melhor toque.

### Detalhes

- Container: `flex flex-col sm:flex-row sm:items-center gap-2 mb-6 sm:flex-wrap`
- Cada Button recebe: `w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs`
- Nenhuma mudança funcional, apenas visual/responsiva
