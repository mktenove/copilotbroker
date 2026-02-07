
# Remover Cores Marrom/Laranja e Substituir por Amarelo Puro

## Diagnostico

Encontrei **resquicios do layout antigo** em diversos arquivos. As cores `amber` (que renderiza como marrom/dourado) e `orange` (laranja) estao presentes em:

- **Badges de status** no Kanban e no detalhe do lead (info_sent = amber, awaiting_docs = orange)
- **Categorias de notas** (documentos = orange)
- **Origens manuais** (amber nos badges e no picker)
- **Avatares de corretores** (gradientes com orange e amber)
- **Alertas de empreendimentos pendentes** (amber em BrokerProjects e BrokerAdmin)
- **Modulo WhatsApp** (HealthScore e SecurityTab com orange/amber)
- **Warnings gerais** (amber nos alertas de erro de envio, CSV import, etc.)

## Estrategia de Substituicao

| Cor antiga | Nova cor | Justificativa |
|---|---|---|
| `amber-600`, `amber-50`, `amber-100`, `amber-200` | `yellow-500` (puro `#FFFF00` / Enove Yellow) | Cor primaria do design novo |
| `orange-600`, `orange-50`, `orange-100`, `orange-200` | `yellow-500` / `yellow-400` | Substituir laranja por amarelo puro |
| `amber-500` (alertas/warnings) | `yellow-500` com opacidade | Manter funcao de alerta mas com cor nova |
| `orange-500` (gradient warmup) | `yellow-500` | Consistencia visual |

## Detalhamento Tecnico

### 1. `src/types/crm.ts` (STATUS_CONFIG, ORIGIN_TYPE_COLORS, NOTE_CATEGORY_CONFIG)

**STATUS_CONFIG:**
- `info_sent`: trocar `text-amber-600` + `bg-amber-50 border-amber-200` por cores amarelo puro adaptadas ao dark theme (`text-yellow-400` + `bg-yellow-500/10 border-yellow-500/30`)
- `awaiting_docs`: trocar `text-orange-600` + `bg-orange-50 border-orange-200` por `text-yellow-300` + `bg-yellow-500/10 border-yellow-400/30`

**ORIGIN_TYPE_COLORS:**
- `manual`: trocar `bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800` por equivalente com `yellow`

**NOTE_CATEGORY_CONFIG:**
- `documentos`: trocar `text-orange-600` + `bg-orange-100 hover:bg-orange-200` por `text-yellow-600` + `bg-yellow-100 hover:bg-yellow-200`

### 2. `src/components/crm/OriginQuickPicker.tsx`

- `manual`: trocar `bg-amber-600/90 hover:bg-amber-500 text-white border-amber-500/50` por `bg-yellow-500/90 hover:bg-yellow-400 text-black border-yellow-400/50`

### 3. `src/components/crm/QuickNotes.tsx`

- `documentos`: trocar `bg-amber-500/20 text-amber-300 border-amber-500/40` por `bg-yellow-500/20 text-yellow-300 border-yellow-500/40`

### 4. `src/components/admin/BrokerManagement.tsx`

- Remover gradientes `from-orange-500 to-red-600` e `from-amber-500 to-orange-600` e substituir por `from-yellow-400 to-yellow-600` e `from-cyan-500 to-blue-600`

### 5. `src/pages/BrokerAdmin.tsx` e `src/pages/BrokerProjects.tsx`

- Trocar todas as referencias `amber-500` nos alertas de empreendimentos pendentes por `yellow-500` (Enove Yellow)

### 6. `src/components/whatsapp/HealthScoreCard.tsx`

- "Atencao": trocar `text-orange-400` + `bg-orange-500` por `text-yellow-400` + `bg-yellow-500`

### 7. `src/components/whatsapp/SecurityTab.tsx`

- Warmup card: trocar `from-amber-500/5 to-orange-500/5 border-amber-500/20` por `from-yellow-500/5 to-yellow-400/5 border-yellow-500/20`
- Trocar `text-amber-400` por `text-yellow-400`

### 8. `src/components/whatsapp/ErrorLogsCard.tsx`

- Trocar `text-amber-400`, `border-amber-500/50` por `text-yellow-400`, `border-yellow-500/50`

### 9. `src/components/whatsapp/AutoMessageRuleEditor.tsx`

- Warning alert: trocar `bg-amber-500/10 border-amber-500/30` + `text-amber-400` por `bg-yellow-500/10 border-yellow-500/30` + `text-yellow-400`

### 10. `src/components/admin/CsvImportModal.tsx`

- Alertas de importacao: trocar `text-amber-500 bg-amber-500/10` por `text-yellow-500 bg-yellow-500/10`

### 11. `src/components/crm/DocumentChecklist.tsx`

- Badge de progresso: trocar `bg-amber-500/20 text-amber-300` por `bg-yellow-500/20 text-yellow-300`

## Resultado Esperado

- Nenhuma cor marrom (amber) ou laranja (orange) restara no painel admin/CRM/corretor
- Todas essas cores serao substituidas por amarelo puro (#FFFF00 / yellow-500) e suas variantes, mantendo consistencia com o Enove Yellow ja usado nos FABs, sidebar e botoes primarios
- Os estados de alerta/warning manterao sua funcao visual, mas usando amarelo puro ao inves de amber/orange
