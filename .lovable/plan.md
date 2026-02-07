

# Limpar Tela Inicial do Corretor

## O que sera removido

Tres elementos serao removidos da pagina `BrokerAdmin.tsx` para deixar a interface mais limpa:

1. **Card "Seus Empreendimentos"** (linhas 178-236) - O bloco clicavel que mostra quantos empreendimentos o corretor tem, com barra de progresso e alerta de pendentes. O acesso a empreendimentos continua disponivel pelo menu lateral (icone Building2).

2. **Cards "Novos Leads" e "Total de Leads"** (linhas 238-261) - Os dois cards de estatisticas que exibem contagem de novos leads e total de leads. Essa informacao ja e visivel no proprio Kanban/lista.

## O que permanece

- Kanban Board (ou Lista, dependendo do modo de visualizacao)
- Botao de adicionar lead
- Busca, importacao CSV e tabela no modo lista
- Menu lateral com todos os links de navegacao (incluindo Empreendimentos)

## Arquivo afetado

`src/pages/BrokerAdmin.tsx` - remocao dos blocos JSX e limpeza de imports nao utilizados (`Building2`, `ArrowRight`, `AlertCircle`, `useBrokerProjects`, `newLeads`).

## Resultado

A tela do corretor abrira direto no Kanban/Lista sem cards intermediarios, proporcionando uma experiencia mais limpa e focada.
