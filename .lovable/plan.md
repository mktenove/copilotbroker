
# Unificar Origens de Leads + Campo de Campanha Mensuravel

## Problema
O campo `lead_origin` armazena strings longas como "Metaads (videos_publico_segmentado) - conversao - 13/02/26 - condominioportao..." criando dezenas de origens diferentes para a mesma plataforma. Isso impossibilita medir corretamente quantos leads vieram do Meta ADS vs Google ADS no Analytics.

## Solucao
Separar em dois campos: `lead_origin` (plataforma padrao) + novo campo `lead_origin_detail` (campanha/conjunto). Ambos ficam na tabela `leads` para serem facilmente mensuráveis e filtraveis no Analytics.

### Exemplo pratico:
```text
ANTES:
  lead_origin: "Metaads (videos_publico_segmentado) - conversao - 13/02/26 - condominioportao..."

DEPOIS:
  lead_origin: "meta_ads"
  lead_origin_detail: "conversao - 13/02/26 - condominioportao - cadastrolead - CBO - Videos - todos"
```

---

## Detalhes Tecnicos

### 1. Migracao de banco de dados
- Adicionar coluna `lead_origin_detail` (text, nullable) na tabela `leads`
- Normalizar dados existentes com UPDATE:
  - Origens que comecam com "Metaads (" -> `lead_origin = 'meta_ads'`, extrair o detalhe para `lead_origin_detail`
  - "Meta Ads (auto)" -> `lead_origin = 'meta_ads'`
  - "Google Ads (auto)" -> `lead_origin = 'google_ads'`
  - "Google (Organico)" -> `lead_origin = 'google_organico'`
  - "Instagram Organico" -> `lead_origin = 'meta_organico'`
  - Origens manuais como "WhatsApp Direto", "Indicacao" etc permanecem como estao

### 2. Atualizar `use-page-tracking.ts`
- `getLeadOriginFromUTM()` retorna agora um objeto `{ origin: string, detail: string | null }` em vez de string
- `formatUTMOrigin()` mapeia utm_source para chaves padrao:
  - metaads/facebook/instagram/fb/ig -> `meta_ads`
  - google (cpc/paid) -> `google_ads`
  - google (organic) -> `google_organico`
  - tiktok -> `tiktok_ads`
- O detalhe (utm_medium + utm_campaign) vai para `lead_origin_detail`
- Exportar tambem uma funcao `getLeadOriginDetailFromUTM()` para uso nos formularios

### 3. Atualizar formularios de landing page
- Nos formularios que salvam leads (FormSection, GVFormSection, MCFormSection, etc), salvar tambem o `lead_origin_detail` junto com `lead_origin`

### 4. Atualizar o Analytics Dashboard
- O grafico "Origem de Marketing" continua agrupando por `lead_origin` (agora padronizado)
- Adicionar um **segundo nivel de drill-down**: ao clicar numa origem, mostrar a lista de campanhas (`lead_origin_detail`) com a contagem de leads de cada uma
- Buscar `lead_origin_detail` no fetch de leads do Analytics

### 5. Atualizar UI do CRM
- No `LeadDetailSheet`, exibir o campo "Campanha/Detalhe" abaixo da origem quando disponivel
- No `KanbanCard`, mostrar tooltip com o detalhe da campanha ao passar o mouse sobre o badge de origem

### Arquivos afetados
- Migracao SQL (nova coluna + normalizar dados existentes)
- `src/hooks/use-page-tracking.ts` - Simplificar origens e separar detalhe
- `src/components/admin/AnalyticsDashboard.tsx` - Drill-down por campanha
- `src/components/crm/LeadDetailSheet.tsx` - Exibir campo de campanha
- `src/components/crm/KanbanCard.tsx` - Tooltip com detalhe
- Formularios de landing pages - Salvar `lead_origin_detail`
- `src/types/crm.ts` - Adicionar campo ao CRMLead
