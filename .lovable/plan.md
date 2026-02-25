

## Plano: Alinhar Narrativas — "Copiloto" vs "Piloto Automático"

### Regras de naming

| Conceito | Nome correto | Descrição |
|----------|-------------|-----------|
| IA que agenda/envia automações, cadências, follow-ups, 1ª mensagem, campanhas | **Copiloto** | Executa ações automatizadas em nome do corretor |
| IA que responde sozinha em tempo real (modo `ai_active`) | **Piloto Automático** | Atende o lead de forma autônoma no chat |
| Modo manual com sugestões | **Modo Copiloto** (sem mudança) | Humano no controle, IA sugere |

### O que precisa mudar

O problema principal está na **label das mensagens enviadas por IA no chat** (`sent_by === "ai"`). Hoje todas aparecem como "Copiloto", mas precisamos distinguir:

- Mensagens enviadas pelo **whatsapp-message-sender** (cadência, follow-up, 1ª mensagem, campanhas) → label **"Copiloto"** (correto)
- Mensagens enviadas pelo **whatsapp-webhook** auto-reply (modo ai_active) → label **"Piloto Automático"**

### Arquivos a alterar

#### 1. `src/components/inbox/ConversationThread.tsx`
- **Linha 231**: Onde mostra `<Bot /> Copiloto` para mensagens `sent_by === "ai"` — precisa distinguir:
  - Se a conversa está em `ai_mode === "ai_active"` E a mensagem foi enviada por IA → mostrar **"Piloto Automático"** com ícone `<Zap />`
  - Caso contrário (automações/cadência) → manter **"Copiloto"** com ícone `<Bot />`
  - Para fazer essa distinção de forma precisa, usar o campo `message_type` ou adicionar lógica baseada no contexto. A abordagem mais simples: verificar se existe um campo que diferencia. Na prática, o `whatsapp-webhook` auto-reply já salva com `sent_by: "ai"` igual ao sender das automações, então precisamos de um diferenciador.
  - **Solução pragmática**: O `whatsapp-webhook` auto-reply insere com `message_type: "text"` e o `whatsapp-message-sender` também. Porém, podemos usar o `status` field ou adicionar uma metadata. A abordagem mais limpa é: usar a propriedade `conversation.ai_mode` como contexto visual no banner (já está correto), e para as mensagens individuais, **manter "Copiloto" para todas as mensagens `sent_by=ai`**, pois ambas são ações da IA agindo em nome do corretor. A distinção real fica nos **banners** e nos **botões de toggle**.

- **Linha 249**: `Sugestão do Copiloto` → manter (correto, são sugestões)
- **Linha 275**: `Pedir sugestão ao Copiloto` → manter (correto)
- **Linha 179**: `Piloto Automático ativo` → já está correto
- **Linha 190**: `Modo Copiloto (Humano no controle)` → já está correto
- **Linha 182**: Botão "Assumir Atendimento" quando Piloto Automático está ativo → mudar para `Desativar Piloto` (mais claro)
- **Linha 193-194**: Botão "Retomar IA" quando em modo Copiloto → mudar para `Ativar Piloto Automático`

#### 2. `src/components/inbox/ConversationList.tsx`
- **Linha 375-378**: Badge `<Bot /> IA` quando `hasCopilot (ai_mode === "ai_active")` → mudar para `<Zap /> Piloto Auto` para diferenciar visualmente que é o Piloto Automático respondendo

#### 3. `src/components/inbox/LeadContextPanel.tsx`
- **Linha 169**: Seção header `Copiloto` → mudar para `Modo IA`
- **Linha 172**: Já está correto (`Piloto Automático` / `Modo Copiloto`)

#### 4. `src/components/inbox/CopilotConfigPage.tsx`
- Manter todas as referências a "Copiloto" — esta página configura o Copiloto (personalidade da IA que rege tanto automações quanto Piloto Automático)

#### 5. `src/pages/BrokerCopilotConfig.tsx`
- **Linha 68**: `Copiloto IA` → manter (é a configuração central)

#### 6. `src/hooks/use-conversations.ts`
- **Linha 174**: `modo Copiloto ativado` → já correto
- **Linha 179**: `Modo Copiloto ativado — mensagens automáticas canceladas` → já correto
- **Linha 185**: `Piloto Automático reativado` → já correto

#### 7. `src/components/broker/BrokerSidebar.tsx` e `BrokerBottomNav.tsx`
- Manter "Copiloto IA" no menu — é o hub central de configuração

### Resumo das mudanças concretas

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `ConversationThread.tsx` | 182 | `Assumir Atendimento` | `Desativar Piloto` |
| `ConversationThread.tsx` | 193-194 | `Retomar IA` | `Ativar Piloto Automático` |
| `ConversationThread.tsx` | 231 | `<Bot /> Copiloto` (todas msgs AI) | Manter mas adicionar ícone `<Zap />` + "Piloto Automático" quando `conversation.ai_mode === "ai_active"` |
| `ConversationList.tsx` | 375-378 | `<Bot /> IA` | `<Zap /> Piloto Auto` |
| `LeadContextPanel.tsx` | 169 | `Copiloto` (header seção) | `Modo IA` |

São 5 pontos de edição em 3 arquivos, sem mudança de lógica — apenas labels e ícones.

