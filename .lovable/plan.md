

# Corrigir acesso ao campo de busca no CRM mobile

## Problema
Na versao mobile, os filtros (Empreendimento, Origens, Corretor) ocupam toda a largura da barra horizontal, empurrando o campo de busca para fora da tela. O usuario ve apenas o icone da lupa no canto direito, sem espaco para digitar.

## Solucao

**Arquivo:** `src/components/crm/KanbanBoard.tsx`

Reorganizar a barra de filtros em **duas linhas no mobile**:
- **Linha 1:** Campo de busca ocupando largura total (visivel e acessivel)
- **Linha 2:** Filtros (Empreendimento, Origens, Corretor) em scroll horizontal

No desktop, manter o layout atual em uma unica linha.

### Implementacao

Trocar o container dos filtros de um unico `flex` para um layout com `flex flex-col md:flex-row`:

1. No mobile: busca fica em cima (primeira linha, largura total) e os filtros ficam abaixo (segunda linha, scroll horizontal)
2. No desktop: tudo continua em uma linha como esta hoje

### Mudanca especifica (linhas ~330-414)

```
<!-- ANTES: tudo em uma linha -->
<div class="flex items-center gap-2 ...">
  [filtros...] [busca com ml-auto]
</div>

<!-- DEPOIS: duas linhas no mobile -->
<div class="flex flex-col gap-2 md:gap-0 mb-4 md:mb-6 px-1">
  <!-- Busca: visivel no topo no mobile, reposicionada no desktop -->
  <div class="md:hidden relative">
    <Search .../> <input ... class="w-full ..." />
  </div>
  <!-- Filtros + busca desktop -->
  <div class="flex items-center gap-2 md:gap-3 overflow-x-auto">
    [filtros...]
    <!-- Busca desktop only -->
    <div class="hidden md:block relative ml-auto">
      <Search .../> <input ... />
    </div>
  </div>
</div>
```

O campo de busca e renderizado duas vezes no JSX mas com `md:hidden` e `hidden md:block`, garantindo que o mesmo state (`searchTerm` / `onSearchChange`) controla ambos. Apenas um aparece por vez.

## Impacto
- Apenas `KanbanBoard.tsx` precisa ser editado
- Nenhuma mudanca de logica, apenas layout CSS
- O campo de busca ficara grande e acessivel no mobile, como primeira coisa que o usuario ve

