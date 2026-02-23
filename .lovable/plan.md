
# Visualizar Configuracao e Duplicar Campanhas de WhatsApp

## O que sera feito

1. **Detalhe da Campanha (Sheet)**: Ao clicar no card de uma campanha, abrir um painel lateral mostrando:
   - Nome, status, projeto, corretor
   - Estatisticas (total, enviados, falhas, respostas)
   - Lista de etapas (steps) configuradas com: mensagem, delay entre etapas, e comportamento de resposta
   - Botao "Duplicar Campanha"

2. **Duplicar Campanha**: Ao clicar em duplicar, abrir o `NewCampaignSheet` pre-preenchido com:
   - Nome: "Copia de [nome original]"
   - Mesmas etapas (mensagens, delays, comportamento de resposta)
   - Mesmos filtros de status (se salvos)
   - O usuario pode alterar os filtros para selecionar novos leads antes de iniciar

## Detalhes Tecnicos

### Novo componente: `src/components/whatsapp/CampaignDetailSheet.tsx`
- Sheet lateral que recebe uma `WhatsAppCampaign`
- Busca os `campaign_steps` da campanha no banco via React Query
- Exibe todas as informacoes de configuracao em formato visual
- Botao "Duplicar" que chama callback `onDuplicate` passando os steps e config

### Alteracoes em `CampaignCard.tsx`
- Adicionar icone de "olho" (Eye) ou tornar o card clicavel para abrir o detalhe
- Adicionar botao de duplicar (Copy) nos botoes de acao

### Alteracoes em `CampaignsTab.tsx`
- Gerenciar state para campanha selecionada e sheet de detalhe aberto
- Gerenciar state para dados de duplicacao pre-preenchidos
- Ao duplicar, abrir `NewCampaignSheet` com props de pre-preenchimento

### Alteracoes em `NewCampaignSheet.tsx`
- Adicionar prop opcional `duplicateData` com steps e nome pre-preenchidos
- No `useEffect` de reset, usar `duplicateData` quando disponivel para preencher os campos

### Fluxo do usuario
1. Na lista de campanhas, clicar no card abre o detalhe lateral
2. No detalhe, ve todas as mensagens configuradas, delays e estatisticas
3. Clica em "Duplicar Campanha"
4. Abre o formulario de nova campanha ja com as mensagens preenchidas
5. Seleciona os leads desejados (novos ou mesmos filtros)
6. Inicia a campanha duplicada
