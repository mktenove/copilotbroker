

# Criar pagina de Termos de Uso exclusiva para o GoldenView

## Contexto

Atualmente, o formulario do GoldenView (`GVFormSection`) aponta para `/termos`, que e a pagina generica de Estancia Velha. Essa pagina menciona "Novo Condominio de Estancia Velha" em varios trechos, o que nao faz sentido para o empreendimento GoldenView de Portao.

O projeto Mauricio Cardoso ja segue o padrao correto, com sua propria pagina de termos em `/novohamburgo/mauriciocardoso/termos`.

## Alteracoes

### 1. Criar pagina `src/pages/goldenview/TermosGoldenView.tsx`

Nova pagina de termos personalizada para o GoldenView, baseada na estrutura de `TermosMauricioCardoso.tsx`, com as seguintes substituicoes no conteudo:

| Texto atual (Estancia Velha) | Texto novo (GoldenView) |
|---|---|
| "Novo Condominio de Estancia Velha" | "GoldenView Residencial" |
| "Formulario de Divulgacao -- Novo Condominio de Estancia Velha" | "Formulario de Divulgacao -- GoldenView Residencial" |
| "comarca de Estancia Velha/RS" | "comarca de Portao/RS" |

O link "Voltar ao cadastro" apontara para `/portao/goldenview#cadastro`.

### 2. Registrar rota em `src/App.tsx`

Adicionar a rota `/portao/goldenview/termos` apontando para `TermosGoldenView`, junto das demais rotas do GoldenView.

### 3. Atualizar links no formulario `src/components/goldenview/GVFormSection.tsx`

Alterar os links dos termos de `/termos#termos-de-uso` e `/termos#politica-de-privacidade` para `/portao/goldenview/termos#termos-de-uso` e `/portao/goldenview/termos#politica-de-privacidade`.

## Resumo dos arquivos

- **Criar:** `src/pages/goldenview/TermosGoldenView.tsx`
- **Editar:** `src/App.tsx` (adicionar import + rota)
- **Editar:** `src/components/goldenview/GVFormSection.tsx` (atualizar links)

