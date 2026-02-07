

# Redesign Premium dos Cards de Resumo do Corretor

## O Problema

Os 3 elementos destacados na imagem (card de empreendimentos + 2 cards de stats) tem um visual generico que destoa do layout premium dark. Especificamente:

- Circulos com icones em fundo amarelo translucido parecem "elementor" / template builder
- A barra de progresso do Radix e grossa e deselegante
- Os cards de "Novos" e "Total" sao planos demais, sem profundidade visual
- Falta hierarquia visual e refinamento tipografico

## Novo Design

### Card "Seus Empreendimentos"

- Remover o circulo amarelo do icone e usar icone inline mais sutil
- Adicionar um gradiente sutil de borda (glow dourado leve)
- Trocar a Progress bar generica por uma barra customizada ultra-fina (2px) com gradiente dourado
- Tipografia mais refinada: numero em destaque com fonte maior
- Seta com animacao de hover mais premium (translateX)

### Cards de Stats ("Novos" / "Total")

- Remover os circulos com icones genericos (parecem Elementor)
- Layout vertical: label em cima, numero grande embaixo, sem icone circular
- Adicionar bordas com gradiente sutil (glow effect)
- O card de "Novos" tera um destaque visual especial (borda primary sutil) quando houver leads novos
- Numeros com tamanho maior e peso mais forte para impacto visual
- Adicionar um separador decorativo sutil (linha dourada fina)

## Visual Esperado

```text
+------------------------------------------------------------+
| [Building2 icon]  Seus Empreendimentos            [->]     |
| 2 de 3 ativos                                              |
| [============================----------] barra ultra-fina   |
| (!) 1 empreendimento disponivel                            |
+------------------------------------------------------------+

+----------------------------+  +----------------------------+
| Novos Leads                |  | Total de Leads             |
|                            |  |                            |
|  _____ (linha dourada)     |  |  _____ (linha dourada)     |
|                            |  |                            |
|  5                         |  |  6                         |
+----------------------------+  +----------------------------+
```

## Detalhamento Tecnico

### Arquivo: `src/pages/BrokerAdmin.tsx`

**Card de Empreendimentos (linhas 180-243):**
- Substituir o div circular do icone por um icone inline com opacidade
- Usar `bg-gradient-to-r from-[#1e1e22] to-[#1a1a1f]` para profundidade
- Trocar `<Progress>` por uma div customizada com height de 2px e gradiente `from-primary via-yellow-400 to-primary`
- Animacao de hover na seta: `group-hover:translate-x-1`
- Borda com `border-[#2a2a2e]` base, com hover para `border-primary/30`

**Cards de Stats (linhas 246-269):**
- Remover completamente os divs circulares com icones `<Users>`
- Layout vertical centralizado a esquerda
- Label: `text-xs uppercase tracking-widest text-muted-foreground/70`
- Separador: `div` com `w-8 h-px bg-primary/40 my-2`
- Numero: `text-3xl sm:text-4xl font-light text-white tracking-tight`
- Card "Novos" com borda `border-primary/20` quando `newLeads.length > 0`
- Background sutil: `bg-[#1e1e22]/80 backdrop-blur-sm`

### Arquivo: Nenhum outro arquivo precisa ser alterado

Toda a mudanca e contida no `BrokerAdmin.tsx`, ja que os cards sao renderizados inline (nao sao componentes separados).

## Resultado Esperado

- Visual premium e minimalista, coerente com o dark theme luxury da Enove
- Sem circulos amarelos genericos que lembram templates
- Tipografia elegante com hierarquia clara
- Detalhes sutis de gradiente e glow que elevam a percepcao de qualidade
