

# Reestruturar Kanban com Funil Sequencial Obrigatorio + Pagina Dedicada do Lead

## Visao Geral

Transformar o Kanban atual (onde o corretor pode pular etapas livremente) em um funil disciplinado com transicoes condicionais, campos obrigatorios em cada etapa, e criar uma pagina dedicada para cada lead com todas as informacoes comerciais e acoes dinamicas.

---

## FASE 1 - Migracao de Banco de Dados

### 1.1 Novos campos na tabela `leads`

```text
timestamp_inicio_atendimento   timestamptz    (quando clicou "Iniciar Atendimento")
data_agendamento               timestamptz    (data/hora do agendamento)
tipo_agendamento               text           (visita, call, reuniao, envio_simulacao)
comparecimento                 boolean        (null = nao registrado, true/false)
valor_proposta                 numeric        (valor da proposta enviada)
data_envio_proposta            timestamptz    (quando enviou a proposta)
valor_final_venda              numeric        (valor final da venda)
data_fechamento                timestamptz    (data do fechamento)
data_perda                     timestamptz    (data da inativacao/perda)
etapa_perda                    text           (etapa onde foi perdido)
```

### 1.2 Novos valores no enum `interaction_type`

Adicionar valores ao enum existente:

```text
agendamento_registrado
comparecimento_registrado
proposta_enviada
venda_confirmada
reagendamento
```

### 1.3 Politicas RLS

Os novos campos estao na tabela `leads` que ja possui RLS completo - nao precisa de novas politicas.

---

## FASE 2 - Tipos e Constantes (TypeScript)

### 2.1 `src/types/crm.ts`

- Atualizar `InteractionType` com os novos valores
- Atualizar `CRMLead` com os novos campos
- Adicionar constante `TIPO_AGENDAMENTO` com opcoes: `visita`, `call`, `reuniao`, `envio_simulacao`
- Renomear conceito de "Inativar" para "Perda" nos labels (status `inactive` continua no banco mas exibido como "Perdido")

---

## FASE 3 - Bloquear Transicoes Livres no Kanban

### 3.1 `src/components/crm/KanbanBoard.tsx`

- **Bloquear drag-and-drop que pula etapas**: no `handleDragEnd`, validar que o destino e exatamente a proxima ou anterior etapa. Se nao for, exibir toast de erro e nao mover.
- **Remover `handleAdvanceStatus` e `handleRegressStatus` genericos** - substituir por acoes especificas por etapa (que abrem modais com campos obrigatorios).
- Adicionar novos handlers:
  - `handleIniciarAtendimento(leadId)` - salva timestamp, avanca para `info_sent`
  - `handleRegistrarAgendamento(leadId, data, tipo)` - salva campos, avanca para `scheduling`
  - `handleRegistrarComparecimento(leadId, compareceu)` - salva comparecimento
  - `handleGerarProposta(leadId, valor)` - salva proposta, avanca para `docs_received`
  - `handleConfirmarVenda(leadId, valorFinal, dataFechamento)` - salva venda, avanca para `registered`

### 3.2 `src/components/crm/KanbanCard.tsx`

- Remover botoes ChevronLeft/ChevronRight genericos
- Substituir por botao de acao contextual por etapa:
  - `new` -> Botao "Iniciar Atendimento" (verde)
  - `info_sent` -> Botao "Registrar Agendamento" (abre modal)
  - `scheduling` -> Botao "Registrar Comparecimento" (abre modal)
  - `docs_received` -> Botao "Confirmar Venda" (abre modal)
  - `registered` -> Sem botao de acao (etapa final)
- Manter botao "Inativar/Perda" em todas exceto `registered`

### 3.3 `src/components/crm/KanbanColumn.tsx`

- Atualizar props para receber os novos handlers contextuais

---

## FASE 4 - Modais de Transicao

Criar 4 novos componentes modais para capturar dados obrigatorios:

### 4.1 `src/components/crm/AgendamentoModal.tsx`

- Campos: data_agendamento (DatePicker), tipo_agendamento (Select)
- Ao salvar: grava no lead + cria interacao + avanca status

### 4.2 `src/components/crm/ComparecimentoModal.tsx`

- Opcoes: "Compareceu" / "Nao Compareceu"
- Se nao compareceu: opcao de Reagendar (abre AgendamentoModal de novo) ou Inativar (motivo obrigatorio)
- Se compareceu: campo valor_proposta obrigatorio + botao "Gerar Proposta"
- Ao confirmar proposta: grava valor + avanca para `docs_received`

### 4.3 `src/components/crm/VendaModal.tsx`

- Campos: valor_final_venda (obrigatorio), data_fechamento (DatePicker)
- Ao confirmar: grava dados + avanca para `registered`

### 4.4 `src/components/crm/PerdaModal.tsx`

- Evolucao do InactivationCombobox atual
- Campos adicionais: registra etapa_perda e data_perda automaticamente

---

## FASE 5 - Pagina Dedicada do Lead

### 5.1 Nova rota: `/corretor/lead/:leadId`

Adicionar rota no `App.tsx`.

### 5.2 Novo arquivo: `src/pages/LeadPage.tsx`

Pagina completa com 5 secoes:

**Secao 1 - Dados Principais**
- Nome, Telefone, Email, Empreendimento, Origem (UTM), Tipo cadastro (automatico/manual), Corretor responsavel, Roleta origem

**Secao 2 - Status Atual**
- Etapa atual do Kanban (badge colorido)
- Tempo na etapa atual (calculado)
- Tempo total no funil (desde created_at)
- SLA (tempo ate primeiro atendimento = timestamp_inicio_atendimento - created_at)

**Secao 3 - Acoes Disponiveis (dinamicas)**
- Renderiza apenas os botoes/formularios aplicaveis a etapa atual
- Mesma logica dos modais da Fase 4, mas inline na pagina
- Incluir: Transferir Lead (Admin/Lider)

**Secao 4 - Informacoes Comerciais**
- data_agendamento, tipo_agendamento, comparecimento, valor_proposta, valor_final_venda, observacoes
- Campos preenchidos aparecem, campos vazios mostram "Pendente"

**Secao 5 - Linha do Tempo (Historico)**
- Reutiliza e expande o componente `LeadTimeline` existente
- Adicionar labels para novos tipos de interacao

### 5.3 Navegacao

- Clicar no card do Kanban agora navega para `/corretor/lead/:leadId` ao inves de abrir Sheet
- Manter `LeadDetailSheet` como fallback ou remover (a pagina substitui)

---

## FASE 6 - Atualizar Componentes Existentes

### 6.1 `src/components/crm/LeadTimeline.tsx`

- Adicionar icons e labels para novos interaction types:
  - `agendamento_registrado` -> icone Calendario
  - `comparecimento_registrado` -> icone CheckCircle / XCircle
  - `proposta_enviada` -> icone DollarSign
  - `venda_confirmada` -> icone Trophy
  - `reagendamento` -> icone RefreshCw

### 6.2 `src/hooks/use-kanban-leads.ts`

- Adicionar novos metodos para as transicoes com campos obrigatorios
- Cada metodo grava os campos no lead + cria a interacao correspondente

### 6.3 `src/components/admin/AnalyticsDashboard.tsx`

- Atualizar funil para refletir os nomes corretos e incluir `scheduling`

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/new.sql` | Adicionar colunas + enum values |
| `src/types/crm.ts` | Novos campos, tipos, constantes |
| `src/hooks/use-kanban-leads.ts` | Novos metodos de transicao |
| `src/components/crm/KanbanBoard.tsx` | Bloquear drag livre, novos handlers |
| `src/components/crm/KanbanCard.tsx` | Botoes contextuais por etapa |
| `src/components/crm/KanbanColumn.tsx` | Novas props |
| `src/components/crm/AgendamentoModal.tsx` | **Novo** - modal agendamento |
| `src/components/crm/ComparecimentoModal.tsx` | **Novo** - modal comparecimento |
| `src/components/crm/VendaModal.tsx` | **Novo** - modal venda |
| `src/components/crm/PerdaModal.tsx` | **Novo** - modal perda (substitui InactivationCombobox) |
| `src/pages/LeadPage.tsx` | **Novo** - pagina dedicada do lead |
| `src/App.tsx` | Nova rota `/corretor/lead/:leadId` |
| `src/components/crm/LeadTimeline.tsx` | Novos tipos de interacao |
| `src/components/crm/index.ts` | Exportar novos componentes |

---

## Regras de Negocio Validadas

- Etapas sao bloqueadas fora da ordem (drag-and-drop e botoes)
- Nao e possivel marcar proposta sem comparecimento registrado
- Nao e possivel confirmar venda sem valor_final_venda
- Nao e possivel perder lead sem motivo
- Todas as acoes geram log na `lead_interactions`
- Cada transicao registra: etapa_origem, etapa_destino, timestamp, usuario_id

