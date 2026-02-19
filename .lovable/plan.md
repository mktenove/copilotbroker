
# Mover lead Luciano para Agendamento

## Situacao atual
- **Lead**: Luciano (ID: `efc96eb2-5d04-417c-b2b6-59ef636f17ae`)
- **Corretora**: Priscila Dienstbach
- **Status atual**: `docs_received` (Proposta)
- **Status desejado**: `scheduling` (Agendamento)

## Acao

Executar um UPDATE direto na tabela `leads` para alterar o status de `docs_received` para `scheduling`, e registrar uma interacao na tabela `lead_interactions` documentando a mudanca manual feita pelo admin.

### Detalhes tecnicos

1. Atualizar `leads.status` de `docs_received` para `scheduling` e limpar campos relacionados a proposta (`valor_proposta`, `data_envio_proposta`, `comparecimento`)
2. Inserir um registro em `lead_interactions` com `interaction_type = 'status_change'`, `old_status = 'docs_received'`, `new_status = 'scheduling'` e nota explicativa
