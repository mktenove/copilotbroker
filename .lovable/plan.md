
# Padronizacao de Cores: Eliminar Tons Quentes do CRM

## Problema

Varios componentes do painel CRM/Admin ainda usam CSS variables genericas (`bg-popover`, `bg-card`, `border-border`, `bg-background`, `bg-muted`) que no dark mode resolvem para tons quentes/marrom (HSL matiz 20-40). Isso causa inconsistencia visual com o restante do layout que ja usa a paleta neutra fria hardcoded.

## Arquivos Afetados e Mudancas

### 1. `src/components/crm/KanbanBoard.tsx` (3 pontos)

| Linha | Antes | Depois |
|---|---|---|
| 243 | `hover:bg-muted` | `hover:bg-[#2a2a2e]` |
| 256 | `bg-popover border-border` | `bg-[#1e1e22] border-[#2a2a2e]` |
| 274 | `bg-popover border-border` | `bg-[#1e1e22] border-[#2a2a2e]` |

### 2. `src/components/crm/InactivationPicker.tsx` (2 pontos)

| Linha | Antes | Depois |
|---|---|---|
| 92 | `hover:bg-muted/50` | `hover:bg-[#2a2a2e]/50` |
| 95 | `border-border bg-card` | `border-[#2a2a2e] bg-[#1e1e22]` |

### 3. `src/components/crm/OriginQuickPicker.tsx` (1 ponto)

| Linha | Antes | Depois |
|---|---|---|
| 141 | `bg-background` (DrawerContent) | `bg-[#0f0f12]` |

### 4. `src/components/admin/CsvImportModal.tsx` (12 pontos)

- **Linha 327**: DialogContent `bg-card border-border` para `bg-[#1e1e22] border-[#2a2a2e]`
- **Linha 394**: Drop zone `border-border` para `border-[#2a2a2e]`
- **Linha 452**: Tabela preview `border border-border` para `border border-[#2a2a2e]`
- **Linha 454**: `bg-muted/50` para `bg-[#2a2a2e]/50`
- **Linha 469**: `border-t border-border` para `border-t border-[#2a2a2e]`
- **Linhas 510, 531, 553**: SelectTrigger `bg-background border-border` para `bg-[#141417] border-[#2a2a2e]`
- **Linhas 513, 534, 556**: SelectContent `bg-popover border-border` para `bg-[#1e1e22] border-[#2a2a2e]`

### 5. `src/components/admin/BrokerManagement.tsx` (5 pontos)

- **Linha 420**: Input `bg-background border border-border` para `bg-[#141417] border border-[#2a2a2e]`
- **Linha 438**: Input email: mesma troca
- **Linha 460**: Container projetos `border border-border ... bg-background` para `border border-[#2a2a2e] ... bg-[#141417]`
- **Linha 463**: Label hover `hover:bg-muted` para `hover:bg-[#2a2a2e]`

### 6. `src/components/admin/LeadsAdvancedFilters.tsx` (2 pontos)

- **Linha 164**: `hover:bg-muted` para `hover:bg-[#2a2a2e]`
- **Linha 231**: `hover:bg-muted` para `hover:bg-[#2a2a2e]`

### 7. Componentes UI base (DrawerContent e DialogContent) -- SEM ALTERACAO

Os componentes `drawer.tsx`, `dialog.tsx`, `select.tsx` e `popover.tsx` usam CSS variables como padrao, mas como sao compartilhados por todo o app (landing pages tambem), nao devem ser alterados. As correcoes sao feitas inline nos componentes do CRM/Admin que os utilizam.

## Paleta de Referencia

| Elemento | Cor |
|---|---|
| Fundo pagina | `#0f0f12` |
| Cards / dropdowns / dialogs | `#1e1e22` |
| Bordas | `#2a2a2e` |
| Inputs / fundo profundo | `#141417` |
| Hover sutil | `#2a2a2e` |

## Resultado Esperado

- Todos os dropdowns (Select), dialogs, drawers, inputs e hovers no CRM/Admin usarao a paleta neutra fria
- Nenhum componente mostrara o fundo cinza quente ao ser aberto
- Componentes UI base permanecem intactos para nao impactar landing pages
