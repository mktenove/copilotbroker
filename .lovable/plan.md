

# Fluxo de agradecimento pos-cadastro para Mauricio Cardoso

## O que muda

Apos o lead preencher o formulario em `/novohamburgo/mauriciocardoso`, a URL muda para `/novohamburgo/mauriciocardoso/obrigado`, mantendo a pagina inteira e a posicao do scroll. A unica diferenca visivel e que a area do formulario e substituida por uma mensagem de agradecimento no estilo da landing page.

## Alteracoes

### 1. Rota `/novohamburgo/mauriciocardoso/obrigado` em `App.tsx`

Adicionar uma nova rota que renderiza o mesmo componente `MauricioCardosoLandingPage`:

```
<Route path="/novohamburgo/mauriciocardoso/obrigado" element={<MauricioCardosoLandingPage />} />
```

### 2. `MauricioCardosoLandingPage.tsx`

Detectar se a URL atual termina em `/obrigado` (via `useLocation`) e passar uma prop `submitted` para `MCFormSection`.

### 3. `MCFormSection.tsx`

- Aceitar prop `submitted?: boolean`
- Apos submit bem-sucedido, chamar `navigate("/novohamburgo/mauriciocardoso/obrigado")` em vez de apenas limpar o form
- Quando `submitted === true`, renderizar bloco de agradecimento no lugar do formulario, mantendo o mesmo container visual (fundo verde escuro `mc-forest`)
- Mensagem: "Parabens, agora voce faz parte da nossa lista VIP!" + subtexto "Em breve entraremos em contato pelo WhatsApp."

### 4. `MauricioCardosoBrokerLandingPage.tsx`

Mesma logica: detectar `/obrigado` na URL e passar `submitted` para `MCFormSection`. A rota do broker nao precisa de rota separada pois o `:brokerSlug` ja captura "obrigado" -- sera necessario ajustar para que "obrigado" nao seja tratado como broker slug. Alternativa mais limpa: adicionar rota explicita `/novohamburgo/mauriciocardoso/:brokerSlug/obrigado` que renderiza `MauricioCardosoBrokerLandingPage`.

## Detalhes tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar rota `/novohamburgo/mauriciocardoso/obrigado` |
| `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx` | Detectar rota `/obrigado` e passar `submitted` ao form |
| `src/components/mauriciocardoso/MCFormSection.tsx` | Aceitar prop `submitted`, renderizar thank-you ou form, navegar para `/obrigado` no submit |
| `src/components/mauriciocardoso/index.ts` | Nenhuma alteracao necessaria (MCFormSection ja e exportado) |

## Visual do bloco de agradecimento

Mantendo a identidade visual da pagina (fundo `mc-forest`, tipografia serif, cores cream/white), o bloco tera:
- Titulo: "Parabens, agora voce faz parte da nossa lista VIP!"
- Subtexto: "Em breve entraremos em contato pelo WhatsApp."
- Mesmo padding e dimensoes do formulario original para manter a posicao do scroll

