

## Rebranding da lista de campanhas

### Problemas identificados

1. **Status incorreto**: Campanhas com 100% de envio (sent_count === total_leads) continuam mostrando "Em andamento" porque nada atualiza o status para "completed" quando todos os envios terminam.
2. **Sem nome do corretor**: A query de campanhas nao faz join com a tabela `brokers`, entao nao ha como exibir quem criou cada campanha.

### Alteracoes

**1. CampaignCard.tsx -- Corrigir status e exibir corretor**
- Adicionar logica para derivar o status visual: se `status === "running"` e `sent_count >= total_leads` e `total_leads > 0`, exibir como "Concluida" independentemente do valor no banco
- Exibir o nome do corretor abaixo do nome da campanha (ao lado do projeto)
- Mostrar a barra de progresso para campanhas concluidas tambem (nao apenas "running"/"paused")

**2. use-whatsapp-campaigns.ts -- Fazer join com broker**
- Alterar a query de campanhas para incluir `broker:brokers(id, name)` no select
- Isso traz o nome do corretor que criou cada campanha

**3. types/whatsapp.ts -- Adicionar broker ao tipo WhatsAppCampaign**
- Adicionar campo opcional `broker?: { id: string; name: string }` na interface

### Visual resultante

Cada card de campanha mostrara:
- Status corrigido (concluida quando 100%)
- Nome da campanha
- Nome do projeto + nome do corretor (ex: "Golden View · por Edinardo")
- Barra de progresso (visivel em todas campanhas, nao so ativas)
- Stats e footer mantidos

### Detalhes tecnicos

A correcao de status e feita no front-end derivando o status visual. O status no banco continua como "running" (uma correcao no sender para atualizar automaticamente seria ideal, mas a correcao visual garante que o usuario veja o estado correto imediatamente).

```text
status visual = 
  se status === "running" e sent_count >= total_leads e total_leads > 0
    -> "completed"
  senao
    -> status original do banco
```

