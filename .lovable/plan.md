
# Campos Editaveis na Pagina do Lead + Follow-Up WhatsApp

## Visao Geral

Duas funcionalidades novas na pagina dedicada do lead:

1. **Dados do Lead editaveis inline** - todos os campos da secao "Dados do Lead" passam a ser editaveis, incluindo o campo "Corretor" que ao ser alterado executa transferencia automatica via RPC `transfer_lead`.

2. **Acao "Agendar Follow-Up"** - botao na secao de Acoes que abre um sheet para criar uma sequencia de mensagens WhatsApp direcionada apenas a esse lead, reutilizando a mesma logica de steps/delays das campanhas.

---

## PARTE 1 - Campos Editaveis

### Comportamento

- A secao "Dados do Lead" exibe os valores atuais normalmente
- Ao clicar no icone de edicao (Pencil), o campo entra em modo de edicao inline
- Campos editaveis: Nome, Telefone, Email, Empreendimento (Select), Origem (Select/Combobox), Corretor (Select), Observacoes
- Ao alterar o **Corretor**, o sistema executa `transfer_lead` RPC + `notify-transfer` (mesmo fluxo do `TransferLeadDialog`)
- Ao salvar qualquer campo, registra uma `lead_interaction` do tipo `note_added` com a alteracao
- Botao "Salvar" aparece quando ha alteracoes pendentes

### Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/LeadPage.tsx` | Substituir `DataField` estatico por `EditableDataField` com estado de edicao, buscar lista de brokers e projects, adicionar logica de save |

### Detalhes tecnicos

- Buscar lista de `brokers` (ativos) e `projects` (ativos) via queries no LeadPage
- Campo "Corretor" usa `Select` com lista de corretores; ao mudar, chamar `supabase.rpc("transfer_lead")` + `notify-transfer`
- Campo "Empreendimento" usa `Select` com lista de projetos
- Campos texto (nome, telefone, email) usam `Input` inline
- Salvar via `supabase.from("leads").update(...)` + registrar interacao
- Refresh dos dados apos salvar

---

## PARTE 2 - Follow-Up WhatsApp

### Comportamento

- Novo botao na secao "Acoes": "Agendar Follow-Up" (icone MessageCircle)
- Ao clicar, abre um Sheet lateral com:
  - Sequencia de mensagens (steps) identica ao `NewCampaignSheet`
  - Cada step: textarea de mensagem + delay configuravel + opcao "enviar mesmo com resposta"
  - Variaveis suportadas: `{nome}`, `{empreendimento}`, `{corretor_nome}`
  - Preview da mensagem personalizada
  - Botao "Agendar Follow-Up"
- Ao confirmar:
  - Cria campanha com `total_leads: 1` vinculada ao lead
  - Insere `campaign_steps`
  - Agenda mensagens na `whatsapp_message_queue` para o lead
  - Registra interacao na timeline

### Novo componente

| Arquivo | Tipo |
|---------|------|
| `src/components/crm/FollowUpSheet.tsx` | **Novo** - Sheet com editor de sequencia de mensagens para um unico lead |

### Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/LeadPage.tsx` | Importar e renderizar `FollowUpSheet`, adicionar botao na secao Acoes |
| `src/components/crm/index.ts` | Exportar `FollowUpSheet` |

### Detalhes tecnicos do FollowUpSheet

- Reutiliza a logica de `useWhatsAppCampaigns` (`createCampaign`) passando o lead como unico target
- Alternativa mais limpa: criar funcao dedicada `createFollowUp` no hook que aceita `leadId` diretamente, sem precisar dos filtros de status
- O componente recebe: `leadId`, `leadName`, `leadPhone`, `projectName`, `brokerName`
- Steps UI: identica ao NewCampaignSheet (textarea + delay presets + sendIfReplied radio)
- Ao criar: insere campanha com nome auto-gerado (ex: "Follow-up - Joao Silva"), vincula ao lead, agenda na fila

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/LeadPage.tsx` | Campos editaveis + botao Follow-Up + queries de brokers/projects |
| `src/components/crm/FollowUpSheet.tsx` | **Novo** - Sheet de follow-up WhatsApp |
| `src/components/crm/index.ts` | Exportar novo componente |

Nenhuma alteracao de banco necessaria - os campos, tabelas e RPCs ja existem.
