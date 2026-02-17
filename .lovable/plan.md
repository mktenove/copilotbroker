

# Enriquecer Timeline com Origem do Lead

## Objetivo

Adicionar um card fixo no final da timeline (como o "primeiro evento" cronologicamente) mostrando como o lead chegou ao sistema: se foi cadastro manual por um corretor, se veio de Meta Ads, Google Ads, etc., e de qual campanha especifica.

## Como funciona

O componente `LeadTimeline` recebera dados adicionais do lead (origem, detalhe da origem, dados de atribuicao UTM, nome do corretor que cadastrou). Com base nesses dados, exibira um card especial no final da timeline (ultimo item, pois a lista e ordenada do mais recente para o mais antigo) com visual diferenciado.

### Exemplos de exibicao

- **Lead de Meta Ads**: `Meta ADS` com detalhe `cpc | campanha-verao-2025`
- **Lead de Google Ads**: `Google Ads` com detalhe `cpc | brand-estancia`
- **Lead manual**: `Cadastro Manual` por `Corretor Joao`
- **Lead organico**: `Google Organico`
- **Lead sem origem**: `Origem nao identificada`

## Alteracoes tecnicas

### 1. `src/components/crm/LeadTimeline.tsx`

- Expandir a interface `LeadTimelineProps` para receber dados opcionais de origem:
  - `leadOrigin?: string | null` (lead_origin do lead)
  - `leadOriginDetail?: string | null` (lead_origin_detail)
  - `attribution?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; landing_page?: string } | null`
  - `createdAt?: string` (data de criacao do lead)
  - `brokerName?: string | null` (nome do corretor atribuido)

- Adicionar um card especial apos o ultimo item da timeline (no final do `space-y-1`):
  - Icone diferenciado: `Globe` para ads/organico, `UserPlus` para cadastro manual
  - Label principal: nome da origem (usando `getOriginDisplayLabel`)
  - Sublabel: detalhe da campanha (`lead_origin_detail`) ou dados UTM
  - Data: `createdAt` do lead formatada
  - Visual: fundo levemente diferenciado (`bg-[#12121a]`), borda sutil, dot com cor especial

- Logica de deteccao:
  - Se `leadOrigin` contem "ads" ou UTM indica pago: mostrar como trafego pago com icone de megafone
  - Se `leadOrigin` e manual (indicacao, plantao, oferta_ativa, etc): mostrar como cadastro manual
  - Se nao tem origem: "Origem nao identificada"

### 2. `src/pages/LeadPage.tsx`

- Passar as novas props para `LeadTimeline`:
  - `leadOrigin={lead.lead_origin}`
  - `leadOriginDetail={lead.lead_origin_detail}`
  - `attribution={lead.attribution}`
  - `createdAt={lead.created_at}`
  - `brokerName={lead.broker?.name}`

Nenhuma alteracao de banco de dados e necessaria -- todos os dados ja existem nas tabelas `leads` e `lead_attribution`.

