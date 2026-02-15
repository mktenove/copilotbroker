

# Indicador visual + efeito sonoro para novos leads em tempo real

## Resumo
Quando um novo lead chegar via Realtime, o sistema vai:
1. Tocar um som de notificacao curto
2. Mostrar uma animacao de destaque (pulse/glow) no card do novo lead por alguns segundos
3. Exibir um toast com o nome do lead

## Alteracoes

### 1. Hook `use-kanban-leads.ts` -- expor callback de novo lead
- Adicionar uma opcao `onNewLead` no hook para notificar o componente pai quando um INSERT acontece
- No handler de INSERT (linha ~128), alem de chamar `fetchLeads()`, chamar o callback `onNewLead` com o ID do novo lead

### 2. `KanbanBoard.tsx` -- som + tracking de leads novos
- Criar um `Set<string>` em um `useRef` para armazenar IDs de leads recem-chegados
- Passar callback `onNewLead` ao hook que:
  - Toca um som de notificacao usando `new Audio()` com um som embutido em base64 (notification chime curto)
  - Adiciona o ID ao Set de leads novos
  - Remove o ID apos 5 segundos (tempo da animacao)
- Passar a lista de IDs "novos" para `KanbanColumn` e `KanbanCard`

### 3. `KanbanCard.tsx` -- animacao de destaque
- Receber prop `isNew?: boolean`
- Quando `isNew` for true, aplicar classes de animacao:
  - Border glow pulsante (ring amarelo/verde com animate-pulse)
  - Fade-in com scale suave

### 4. `KanbanColumn.tsx` -- repassar prop
- Repassar a prop `isNew` de cada lead para o `KanbanCard`

### 5. Som de notificacao
- Usar um som curto em base64 embutido no codigo (notification chime de ~0.5s) para evitar dependencias externas
- Respeitar permissoes do navegador -- o som so toca se o usuario ja interagiu com a pagina

## Detalhes tecnicos

**Som**: Um data URI com audio MP3 curto (notification bell). Sera criado como constante e tocado via `new Audio(dataUri).play().catch(() => {})` (catch silencioso caso o browser bloqueie autoplay).

**Animacao**: Classes Tailwind com `animate-pulse` combinado com `ring-2 ring-emerald-400/60` que serao removidas apos 5s via timeout.

**Fluxo**:
1. Realtime INSERT detectado no hook
2. Hook chama `onNewLead(leadId)`
3. KanbanBoard adiciona ID ao Set, toca som, mostra toast
4. KanbanCard renderiza com glow pulsante
5. Apos 5s, animacao e removida

