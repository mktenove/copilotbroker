

## Varredura Completa: Restos do Sistema Antigo

Encontrei **resquícios significativos** em diversas áreas do projeto. Abaixo está o inventário completo e o plano de limpeza.

---

### 1. Build Error (Crítico - Imediato)
- **`src/pages/Onboarding.tsx`**: Importa `logo-enove.png` que foi deletado. Precisa trocar para `copilot-logo-dark.png`.

### 2. Páginas com Branding "Enove" (Substituir por "Copilot Broker")
| Arquivo | Problema |
|---------|----------|
| `src/pages/Onboarding.tsx` | Logo Enove, título "Configurar Conta \| Enove" |
| `src/pages/BrokerSignup.tsx` | Logo Enove, texto "Corretor Enove", importa `logo-enove.png` |
| `src/pages/Admin.tsx` | Título "CRM \| Enove", labels "Enove" nos cards de contagem |
| `src/pages/BrokerAdmin.tsx` | Título "CRM \| Enove" |
| `src/pages/AdminCopilotConfig.tsx` | Título "Copiloto IA & WhatsApp \| Enove" |
| `src/pages/Termos.tsx` | Todo o conteúdo refere "ENOVE IMOBILIÁRIA LTDA", "Novo Condomínio de Estância Velha" |
| `src/pages/Home.tsx` | Canonical URL aponta para `onovocondominio.com.br` |

### 3. Componentes com Referências Legadas
| Arquivo | Problema |
|---------|----------|
| `src/components/admin/AdminSidebar.tsx` | Importa `logo-enove-mini.png` |
| `src/components/broker/BrokerSidebar.tsx` | Importa `logo-enove-mini.png` |
| `src/components/admin/LeadsTable.tsx` | Label "Enove" para source |
| `src/components/admin/AnalyticsDashboard.tsx` | "Distribuição Enove vs Corretores" |
| `src/components/admin/ExportButton.tsx` | Source "Enove" |
| `src/components/admin/BrokerManagement.tsx` | URLs hardcoded `/estanciavelha/` |
| `src/components/crm/KanbanBoard.tsx` | Filtro "Enove (Direto)" |
| `src/components/whatsapp/AutoCadenciaRuleEditor.tsx` | Mensagem template menciona "Enove Imobiliária" |
| `src/components/AppHead.tsx` | Título "Enove", cor `#B8860B`, refs a manifests deletados |
| `src/components/home/*` | Toda a seção Home refere "Enove Select", "lançamentos imobiliários no RS" |

### 4. Hooks com URLs Legadas
| Arquivo | Problema |
|---------|----------|
| `src/hooks/use-broker-projects.ts` | URLs hardcoded para `/estanciavelha/`, `/prontos/` |
| `src/hooks/use-kanban-column.ts` | Filtro `"enove"` |
| `src/hooks/use-page-tracking.ts` | Domínio `onovocondominio` nos ownDomains |

### 5. CSS com Variáveis Legadas
- **`src/index.css`**: Toda a paleta "Mauricio Cardoso - Botanical Luxury Palette" (`--mc-sage`, `--mc-stone`, etc.), comentários "luxury real estate"

### 6. Arquivos Públicos
- **`public/manifest.json`**: Nome "Enove Imobiliária", referencia `favicon-enove.png` (deletado)

---

### Plano de Correção (7 tarefas)

1. **Corrigir build error**: Atualizar `Onboarding.tsx` para usar `copilot-logo-dark.png` e branding Copilot Broker
2. **Atualizar branding nas páginas**: Substituir "Enove" por "Copilot Broker" em `Admin.tsx`, `BrokerAdmin.tsx`, `BrokerSignup.tsx`, `AdminCopilotConfig.tsx`
3. **Atualizar sidebars**: Trocar `logo-enove-mini.png` por `copilot-icon.png` em `AdminSidebar.tsx` e `BrokerSidebar.tsx`
4. **Limpar componentes CRM**: Substituir labels "Enove" por "Direto" (leads sem corretor) em `LeadsTable`, `KanbanBoard`, `AnalyticsDashboard`, `ExportButton`
5. **Remover URLs legadas**: Limpar referências a `/estanciavelha/` e `/prontos/` em `use-broker-projects.ts`, `BrokerManagement.tsx`; atualizar `use-page-tracking.ts`
6. **Limpar CSS e AppHead**: Remover variáveis Mauricio Cardoso do `index.css`; atualizar `AppHead.tsx` para Copilot Broker; atualizar `manifest.json`
7. **Reescrever Termos.tsx**: Atualizar os termos legais para Copilot Broker (ou criar placeholder genérico), remover referências a "Estância Velha" e "ENOVE IMOBILIÁRIA LTDA"

