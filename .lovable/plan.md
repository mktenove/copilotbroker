

## Importação de Leads via CSV

### Visão Geral

Implementar um sistema de importação em massa de leads via arquivo CSV, permitindo que admins e corretores carreguem múltiplos leads de uma só vez.

---

### Formato CSV

O sistema aceitará CSVs simples com apenas 2 colunas obrigatórias:

| Coluna | Obrigatório | Descrição |
|--------|-------------|-----------|
| nome / name | Sim | Nome completo do lead |
| whatsapp / telefone / phone | Sim | Número de WhatsApp |
| origem / origin | Não | Origem específica (se vazio, usa padrão selecionado) |

**Exemplo de CSV:**
```text
nome,whatsapp,origem
João Silva,51999887766,Indicação
Maria Santos,(51) 98765-4321,
Pedro Costa,5199876543,Meta ADS
```

---

### Fluxo do Usuário

1. Clica no botão "+" na sidebar (FAB)
2. No modal que abre, escolhe entre **Adicionar Lead** ou **Importar CSV**
3. Faz upload do arquivo CSV (drag & drop ou clique)
4. Visualiza prévia dos dados detectados
5. Seleciona empreendimento e origem padrão
6. (Admin) Pode selecionar corretor para atribuição
7. Confirma importação
8. Recebe feedback com contagem de sucessos/erros

---

### Arquivos a Criar

**1. `src/lib/csv-parser.ts`**

Utilitário para:
- Parse de texto CSV para array de objetos
- Normalização de headers (case-insensitive, aliases como "nome"/"name", "whatsapp"/"telefone"/"phone")
- Limpeza de números de WhatsApp (formato 55XXXXXXXXXXX)
- Validação de campos obrigatórios
- Detecção de duplicatas

**2. `src/components/admin/CsvImportModal.tsx`**

Modal dedicado com:
- Área de drag & drop / seleção de arquivo
- Botão para baixar template CSV de exemplo
- Prévia dos dados em tabela (primeiras 5 linhas)
- Indicadores visuais de validação (✓ válido, ✗ erro)
- Seletores de empreendimento, origem padrão e corretor
- Barra de progresso durante importação
- Resumo final (importados / erros / duplicados)

---

### Arquivos a Modificar

**1. `src/components/admin/AddLeadModal.tsx`**

Transformar em modal com 2 opções:
- Tab/botão "Manual" (formulário atual)
- Tab/botão "Importar CSV" (abre CsvImportModal)

Ou manter separado e adicionar segundo botão no FAB menu.

**2. `src/pages/Admin.tsx`**

- Adicionar estado para controlar modal de importação
- Passar callbacks necessários

**3. `src/pages/BrokerAdmin.tsx`**

- Mesmas alterações para painel do corretor
- Corretor fixo automaticamente

---

### Detalhes Técnicos

**Parser CSV:**
- Nome: mínimo 2 caracteres
- WhatsApp: extrair apenas números, garantir formato 55XXXXXXXXXXX
- Detectar duplicatas no próprio arquivo (por whatsapp)
- Detectar leads já existentes no banco (por whatsapp)

**Inserção:**
- Usar `crypto.randomUUID()` para cada lead
- Inserir em lotes de 50 leads
- Registrar `lead_attribution` para cada lead
- Marcar origem como "Importação CSV" ou origem selecionada
- **Não** disparar notificações WhatsApp para importação em massa

**Limites:**
- Máximo 500 leads por importação
- Validação rigorosa de todos os campos

---

### Interface Visual

```text
┌─────────────────────────────────────────────┐
│  📥 Importar Leads via CSV                  │
│─────────────────────────────────────────────│
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │   📄 Arraste o arquivo CSV aqui        │ │
│  │       ou clique para selecionar        │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  📋 Baixar template CSV de exemplo          │
│                                             │
│  ───────────────────────────────────────    │
│                                             │
│  Empreendimento *:  [Selecione...]       ▼  │
│  Origem padrão:     [Plantão]            ▼  │
│  Corretor:          [Enove]              ▼  │
│                                             │
│  ───────────────────────────────────────    │
│                                             │
│  📋 Prévia (5 primeiros):                   │
│  ┌────────────┬───────────────┬──────────┐  │
│  │ Nome       │ WhatsApp      │ Status   │  │
│  ├────────────┼───────────────┼──────────┤  │
│  │ João Silva │ 5551999887766 │ ✓ Válido │  │
│  │ Maria      │ 5551987654321 │ ✓ Válido │  │
│  │ (vazio)    │ 5551...       │ ✗ Erro   │  │
│  └────────────┴───────────────┴──────────┘  │
│                                             │
│  47 válidos │ 3 erros │ 0 duplicados        │
│                                             │
│       [Cancelar]       [Importar 47 Leads]  │
│                                             │
└─────────────────────────────────────────────┘
```

