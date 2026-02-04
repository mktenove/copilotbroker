
# Plano: Adicionar Módulo WhatsApp Completo para Admin

## Contexto

Atualmente, a página `/admin/whatsapp` (`AdminWhatsApp.tsx`) mostra apenas um dashboard com visão global das instâncias dos corretores. O módulo do corretor (`BrokerWhatsApp.tsx`) possui funcionalidades mais completas com abas de Conexão, Campanhas, Fila, Segurança e Automação.

O objetivo é adicionar o módulo completo de WhatsApp para o admin, com todas as funcionalidades disponíveis para corretores, além da visão global já existente.

---

## Alterações Necessárias

### Arquivo: `src/pages/AdminWhatsApp.tsx`

**Modificações:**
1. Adicionar sistema de abas similar ao `BrokerWhatsApp.tsx`
2. Manter a visão global existente como uma aba "Visão Global"
3. Adicionar novas abas: Conexão (própria do admin), Campanhas, Fila, Segurança, Automação
4. Renomear título para "WhatsApp - Atendimento Assistido"
5. Reutilizar os mesmos componentes do corretor (`ConnectionTab`, `CampaignsTab`, etc.)

---

## Nova Estrutura de Abas

| Aba | Descrição |
|-----|-----------|
| **Visão Global** | Dashboard atual com todas as instâncias dos corretores |
| **Conexão** | Gerenciar instância WhatsApp do admin (opcional) |
| **Campanhas** | Templates e campanhas para disparo |
| **Fila** | Fila de mensagens pendentes |
| **Segurança** | Opt-outs e limites de envio |
| **Automação** | Regras de primeira mensagem automática |

---

## Detalhes Técnicos

### Imports adicionais:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Bot, Eye } from "lucide-react";
import { ConnectionTab } from "@/components/whatsapp/ConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";
```

### Estrutura de abas:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList>
    <TabsTrigger value="overview">
      <Eye /> Visão Global
    </TabsTrigger>
    <TabsTrigger value="connection">
      <Wifi /> Conexão
    </TabsTrigger>
    <TabsTrigger value="campaigns">
      <Megaphone /> Campanhas
    </TabsTrigger>
    <TabsTrigger value="queue">
      <Send /> Fila
    </TabsTrigger>
    <TabsTrigger value="security">
      <Shield /> Segurança
    </TabsTrigger>
    <TabsTrigger value="automation">
      <Bot /> Automação
    </TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Dashboard atual com stats e tabela de instâncias */}
  </TabsContent>

  <TabsContent value="connection">
    <ConnectionTab />
  </TabsContent>

  {/* ... outras abas ... */}
</Tabs>
```

---

## Wireframe da Interface

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  WhatsApp - Atendimento Assistido                         [Atualizar]  │
│  Gerencie conexões e dispare mensagens automatizadas                   │
├─────────────────────────────────────────────────────────────────────────┤
│  [Visão Global] [Conexão] [Campanhas] [Fila] [Segurança] [Automação]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  (conteúdo da aba selecionada)                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Comportamento

1. **Aba "Visão Global"** (padrão): Mostra o dashboard atual com stats de todas as instâncias
2. **Demais abas**: Reutilizam os componentes do corretor, mas com contexto de admin
3. O admin pode ter sua própria instância WhatsApp para disparos globais
4. Templates padrão (broker_id = null) são gerenciados pelo admin na aba Campanhas
5. Regras de automação do admin podem ser configuradas para envios globais

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminWhatsApp.tsx` | Reestruturar com sistema de abas |

---

## Resultado Esperado

- Admin terá acesso às mesmas funcionalidades que os corretores
- Visão global permanece como primeira aba
- Navegação consistente entre admin e corretor
- Nome do módulo padronizado: "WhatsApp - Atendimento Assistido"
