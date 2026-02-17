
# Corrigir Botao Transferir na Pagina do Lead

## Problema

O botao "Transferir" na pagina do lead (`/corretor/lead/:id`) define o estado `transferOpen = true` ao ser clicado, porem o componente `TransferLeadDialog` nunca foi importado nem renderizado nesta pagina. Ou seja, nada acontece ao clicar.

## Solucao

Adicionar o import e a renderizacao do `TransferLeadDialog` no arquivo `src/pages/LeadPage.tsx`.

## Alteracoes tecnicas

### Arquivo: `src/pages/LeadPage.tsx`

1. **Adicionar import** do `TransferLeadDialog`:
   ```
   import { TransferLeadDialog } from "@/components/crm/TransferLeadDialog";
   ```

2. **Renderizar o componente** junto aos demais modais (provavelmente proximo das outras modais como `AgendamentoModal`, `PerdaModal`, etc., no final do JSX):
   ```
   <TransferLeadDialog
     leadId={lead.id}
     leadName={lead.name}
     currentBrokerId={lead.broker?.id}
     brokers={allBrokers}
     isOpen={transferOpen}
     onClose={() => setTransferOpen(false)}
     onTransferred={refreshLead}
   />
   ```

Todos os dados necessarios ja estao disponiveis no componente:
- `lead.id`, `lead.name`, `lead.broker?.id` vem do state `lead`
- `allBrokers` ja e buscado via React Query (linha 73-79)
- `transferOpen` / `setTransferOpen` ja existem (linha 53)
- `refreshLead` ja existe para atualizar os dados apos a transferencia
