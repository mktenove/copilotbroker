
# Abrir campo de texto ao Iniciar Atendimento

## Contexto
Atualmente, ao clicar em "Iniciar Atendimento", o sistema muda o status do lead e abre o WhatsApp automaticamente sem dar ao corretor a chance de escrever a mensagem primeiro. O texto enviado nao e salvo na timeline.

## Solucao
Ao clicar em "Iniciar Atendimento", em vez de executar a acao imediatamente, abrir um campo de texto inline (similar ao que ja existe no botao "Enviar WhatsApp") para o corretor digitar a mensagem. Ao confirmar, o sistema:
1. Inicia o atendimento (muda status para `info_sent`)
2. Salva a mensagem na timeline como interacao `whatsapp_manual`
3. Abre o WhatsApp com a mensagem pre-preenchida

## Alteracoes

### Arquivo 1: `src/pages/LeadPage.tsx`
- Adicionar estado `iniciarAtendimentoOpen` (boolean) e `iniciarAtendimentoMsg` (string)
- Ao clicar no botao "Iniciar Atendimento", em vez de chamar `iniciarAtendimento()` direto, setar `iniciarAtendimentoOpen(true)` para exibir o campo de texto
- Renderizar um bloco inline (abaixo dos botoes de acao) com:
  - Textarea para digitar a mensagem
  - Botao "Iniciar e Enviar via WhatsApp" que:
    1. Chama `iniciarAtendimento(lead.id)`
    2. Registra interacao `whatsapp_manual` com o texto completo
    3. Abre `wa.me` com a mensagem codificada
    4. Limpa o campo e fecha
  - Botao "Cancelar"

### Arquivo 2: `src/components/crm/KanbanBoard.tsx`
- Mesmo ajuste no Kanban: ao clicar no botao de iniciar atendimento no card, em vez de executar direto, abrir um modal/dialog simples com o campo de texto
- Criar estado `iniciarAtendimentoModal` com `{ open, leadId, message }`
- Renderizar um Dialog simples com Textarea e botao de confirmar
- Ao confirmar: chamar `iniciarAtendimento()`, salvar interacao `whatsapp_manual` na timeline, abrir WhatsApp

### Detalhes tecnicos

**LeadPage.tsx** - novo estado e bloco inline:
```typescript
const [iniciarAtendimentoOpen, setIniciarAtendimentoOpen] = useState(false);
const [iniciarAtendimentoMsg, setIniciarAtendimentoMsg] = useState("");
```

No `handlePrimaryAction`, caso "iniciar": abrir o campo em vez de executar.

Bloco inline renderizado logo apos os botoes de acao (dentro do mesmo condicional `!isSold && !isLost`), visivel quando `iniciarAtendimentoOpen && lead.status === "new"`.

**KanbanBoard.tsx** - novo estado e Dialog:
```typescript
const [iniciarModal, setIniciarModal] = useState<{ open: boolean; leadId: string | null; message: string }>({ open: false, leadId: null, message: "" });
```

`handleIniciarAtendimento` passa a abrir o modal. Um novo Dialog com Textarea e botao confirma a acao.
