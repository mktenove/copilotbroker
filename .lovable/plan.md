

# Nova Etapa de Revisao + Cores Premium

## Visao Geral

Adicionar uma **Etapa 6 — Revisao** entre Validacao e Importacao, onde o usuario ve todos os contatos validos com checkboxes para desmarcar os que nao quer importar. Tambem ajustar todas as cores do wizard para o padrao premium do layout (fundo escuro #0f0f12/#1e1e22, amarelo Enove #FFFF00).

## Arquivo editado

`src/components/admin/CsvImportModal.tsx`

## Mudancas

### 1. Nova etapa no wizard (7 etapas)

```text
Antes: Upload → Pre-visualizacao → Mapeamento → Regras → Validacao → Importacao
Depois: Upload → Pre-visualizacao → Mapeamento → Regras → Validacao → Revisao → Importacao
```

- `STEPS` passa de 6 para 7 itens
- Etapa 6 = "Revisao" (nova)
- Etapa 7 = "Importacao" (renumerada)

### 2. Etapa "Revisao" — funcionalidade

- Exibir todos os contatos validos em uma lista com checkbox
- Todos iniciam marcados (selecionados)
- Header com "Selecionar todos / Desmarcar todos" e contador "X de Y selecionados"
- Cada linha mostra: checkbox, nome, telefone normalizado, origem
- Scroll vertical com altura maxima
- Busca rapida para filtrar por nome/telefone
- Botao "Importar X contatos" (apenas os marcados)
- Se nenhum selecionado, botao desabilitado

### 3. Novo estado

- `selectedLeads: Set<number>` — indices dos contatos selecionados (inicializado com todos os validos)
- `reviewSearch: string` — filtro de busca na tela de revisao

### 4. Ajuste no fluxo de importacao

- Na etapa 7 (import), filtrar `processResult.validRows` apenas pelos indices presentes em `selectedLeads`
- Atualizar contagem de metricas finais

### 5. Cores premium (todo o modal)

Substituir classes genericas por cores do padrao Enove:

| Elemento | Antes | Depois |
|---|---|---|
| Dialog background | `bg-card` | `bg-[#141417]` |
| Dialog border | `border-border` | `border-[#2a2a2e]` |
| Stepper ativo/done | `bg-primary` | `bg-[#FFFF00] text-black` |
| Stepper inativo | `bg-muted` | `bg-[#1e1e22] text-slate-500` |
| Stepper linha done | `bg-primary` | `bg-[#FFFF00]` |
| Botoes primarios | default | `bg-[#FFFF00] text-black hover:shadow-[0_0_20px_rgba(255,255,0,0.3)]` |
| Cards de metrica | `bg-muted/30` | `bg-[#1e1e22] border-[#2a2a2e]` |
| Dropzone | `border-primary` | `border-[#FFFF00]` |
| Icones destaque | `text-primary` | `text-[#FFFF00]` |
| Radio/Switch/Select bg | `bg-muted/30` | `bg-[#1e1e22]/50` |
| Textos | `text-foreground` | `text-white` |
| Textos secundarios | `text-muted-foreground` | `text-slate-400` |
| Info box | `bg-muted/50` | `bg-[#1e1e22] border border-[#2a2a2e]` |

### Detalhes tecnicos

- Checkbox usa componente `@/components/ui/checkbox` ja existente
- Busca filtra localmente a lista de `processResult.validRows` mas nao altera `selectedLeads`
- "Selecionar todos" e "Desmarcar todos" operam sobre a lista filtrada (se ha busca ativa, so afeta os visiveis)
- Performance: para listas grandes (>500 rows), a lista usa `max-h-[400px] overflow-y-auto` sem virtualizacao (contatos CSV raramente passam de 2000 linhas)

