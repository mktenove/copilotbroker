
# Restringir seção Propostas à aba correta

## Problema
A seção `PropostasList` está sendo renderizada incondicionalmente na página do lead, independente do status. Isso permite que o usuário veja e crie propostas nas etapas de Pré Atendimento, Atendimento e Agendamento, podendo pular etapas do funil.

## Solução
Adicionar uma condição no `src/pages/LeadPage.tsx` para que o componente `PropostasList` só seja exibido quando o lead estiver nos status `docs_received` (Proposta) ou `registered` (Vendido), ou nos status finais (`sold`, `inactive`) caso já existam propostas registradas.

## Alteração

**Arquivo:** `src/pages/LeadPage.tsx`

Envolver o bloco `<PropostasList ... />` (linhas 455-469) em uma condição:

```tsx
{(lead.status === "docs_received" || lead.status === "registered" || 
  ((lead.status === "sold" || lead.status === "inactive") && propostas.length > 0)) && (
  <PropostasList ... />
)}
```

Isso garante que:
- Nas etapas Pré Atendimento, Atendimento e Agendamento a seção não aparece
- Na etapa Proposta e Vendido ela aparece normalmente
- Em leads finalizados (venda/perda) ela aparece somente se houver propostas existentes
