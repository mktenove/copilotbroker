
# Pagina de obrigado apos cadastro no GoldenView

## O que sera feito

Apos o envio do formulario na pagina `/portao/goldenview`, o usuario sera redirecionado para `/portao/goldenview/obrigado`. Essa pagina mantera toda a landing page identica, mas na secao do formulario os campos serao substituidos pela mensagem "Parabens, agora voce faz parte da nossa lista VIP!".

## Alteracoes

### 1. `src/App.tsx`
- Adicionar rota `/portao/goldenview/obrigado` apontando para o mesmo `GoldenViewLandingPage` com uma prop ou usando o mesmo componente com logica baseada na rota.

### 2. `src/pages/goldenview/GoldenViewLandingPage.tsx`
- Detectar se a rota atual e `/portao/goldenview/obrigado` (via `useLocation`)
- Passar uma prop `submitted={true}` para o `GVFormSection` quando estiver na rota de obrigado

### 3. `src/components/goldenview/GVFormSection.tsx`
- Adicionar prop `submitted?: boolean`
- Quando `submitted` for `true`, renderizar no lugar do formulario a mensagem de confirmacao: "Parabens, agora voce faz parte da nossa lista VIP!" com estilo visual coerente com o card atual
- Manter o titulo da secao e o card com fundo escuro, apenas substituindo os campos internos
- Quando o formulario for enviado com sucesso (fluxo normal), usar `navigate("/portao/goldenview/obrigado")` para redirecionar

## Detalhes tecnicos

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Adicionar rota `/portao/goldenview/obrigado` |
| `src/pages/goldenview/GoldenViewLandingPage.tsx` | Detectar rota e passar prop `submitted` |
| `src/components/goldenview/GVFormSection.tsx` | Aceitar prop `submitted`, mostrar mensagem VIP ou formulario, e redirecionar apos submit |

A pagina de obrigado mantara o scroll na mesma posicao da landing page (o formulario ficara visivel ao carregar). O Meta Pixel e Clarity tambem funcionarao normalmente na pagina de obrigado pois compartilham o mesmo componente pai.
