
## Objetivo (solução definitiva)
Garantir que ao adicionar **onovocondominio.com.br/auth** à tela inicial do celular:
1) o atalho **abra diretamente /auth** (login) quando deslogado  
2) o ícone apareça com o **nome “CRM”** (não “Enove”)  
3) se o usuário já estiver logado, pode **redirecionar para /admin ou /corretor/admin** (conforme você confirmou)

---

## Diagnóstico do porquê está acontecendo
Hoje o `index.html` define **sempre**:
- `<link rel="manifest" href="/manifest.json">` (start_url = `/`)
- `<meta name="apple-mobile-web-app-title" content="Enove">`

Então, quando o iPhone cria o atalho, ele tende a usar **o manifest padrão do site** e o “nome padrão” (“Enove”), e por isso o atalho abre a **raiz /** em vez de `/auth`.

Nos dashboards (/admin e /corretor/admin) vocês já têm manifests específicos (`manifest-crm*.json`) via Helmet, mas o `/auth` não tem um manifest próprio e ainda herda o manifest do `index.html`.

Para ficar definitivo, precisamos garantir que:
- exista um **manifest próprio do /auth** com `start_url: "/auth"` e nome “CRM”
- exista **apenas um manifest “válido” por rota** (evitando que o navegador escolha o errado)

---

## Solução proposta (robusta e consistente)
### A) Criar um manifest dedicado para o atalho do login (CRM)
Criar novo arquivo em `public/`:

- `public/manifest-crm-auth.json`

Com:
- `name`: `"CRM Enove"`
- `short_name`: `"CRM"`
- `start_url`: `"/auth"`
- `scope`: `"/"` (importante para permitir navegar para `/admin` após login sem “sair do app”)
- `id`: `"/auth"` (importante no iOS para diferenciar instalações)
- cores iguais ao CRM (dark + amarelo)
- ícones iguais aos atuais (pode manter `favicon-enove.jpg`, pois o requisito principal aqui é o **nome “CRM”** e o **start_url**)

### B) Centralizar o “head” (manifest + título iOS) por rota (uma fonte de verdade)
Criar um componente único de head (via `react-helmet-async`) que escolha automaticamente qual manifest usar conforme a URL.

Regras:
- Se rota começa com `/admin` → usar `/manifest-crm.json` e `apple-mobile-web-app-title=CRM`
- Se rota começa com `/corretor` → usar `/manifest-crm-broker.json` e `apple-mobile-web-app-title=CRM`
- Se rota é `/auth` → usar `/manifest-crm-auth.json` e `apple-mobile-web-app-title=CRM`
- Caso contrário (site público) → usar `/manifest.json` e `apple-mobile-web-app-title=Enove`

Implementação:
- Ajustar `src/App.tsx` para renderizar esse “AppHead” **dentro** do `BrowserRouter` usando `useLocation()` (pois precisa ler o pathname).
- Isso elimina “efeitos colaterais” de múltiplos `<link rel="manifest">` competindo entre si.

### C) Remover do `index.html` os itens que causam conflito
Editar `index.html` para remover:
- `<link rel="manifest" href="/manifest.json" />`
- `<meta name="apple-mobile-web-app-title" content="Enove" />`
- (opcional mas recomendado) também remover o `<meta name="theme-color" ...>` estático, e deixar o AppHead setar `theme-color` por rota (Enove vs CRM), para manter coerência.

Motivo: tags estáticas no `index.html` são sempre carregadas e podem ser “escolhidas” pelo iOS no momento de criar o atalho, mesmo que depois o React injete outras.

### D) Evitar duplicidade: limpar Helmet específico dos dashboards
Como `/admin` e `/corretor/admin` hoje já definem `<Helmet>` com manifest e apple title, vamos:
- Remover ou reduzir esses blocos em:
  - `src/pages/Admin.tsx`
  - `src/pages/BrokerAdmin.tsx`
Deixar neles apenas o que for realmente “da página” (se houver), e o PWA/manifest fica centralizado no AppHead.

### E) Garantir o nome “CRM” no ícone do /auth
Atualizar `src/pages/Auth.tsx` para incluir `<Helmet>` com pelo menos:
- `<title>` apropriado (ex: “CRM | Login”)
- (se quisermos redundância segura) repetir `apple-mobile-web-app-title=CRM` e `theme-color` ali também  
Mas o ponto principal é que o AppHead já fará isso.

---

## Arquivos envolvidos
1) **Criar**
- `public/manifest-crm-auth.json`

2) **Modificar**
- `index.html` (remover manifest e apple-mobile-web-app-title estáticos)
- `src/App.tsx` (criar/AppHead + roteamento para setar manifest por URL)
- `src/pages/Admin.tsx` (remover Helmet de manifest/apple title para evitar duplicidade)
- `src/pages/BrokerAdmin.tsx` (mesmo)
- `src/pages/Auth.tsx` (adicionar título e, se desejável, redundância de meta/manifest — ou apenas título)

---

## Critérios de aceite (o que você vai ver na prática)
No iPhone (Safari):
1) Abrir **https://onovocondominio.com.br/auth**
2) “Compartilhar” → “Adicionar à Tela de Início”
3) O atalho deve aparecer como **CRM**
4) Ao tocar no ícone:
   - se **deslogado**: abre diretamente **/auth**
   - se **logado**: pode redirecionar para **/admin** ou **/corretor/admin** (comportamento atual do app)

---

## Passo a passo de teste (para evitar cache do iOS)
Depois de publicar:
1) Apagar o atalho antigo da tela inicial (“Enove”/atalho anterior).
2) iOS: Ajustes → Safari → **Limpar Histórico e Dados dos Sites** (opcional, mas ajuda).
3) Fechar o Safari totalmente (deslizar pra cima e remover da multitarefa).
4) Abrir `/auth` de novo e adicionar o atalho novamente.

---

## Observação importante (por que isso resolve “definitivamente”)
O principal “pulo do gato” é tirar do `index.html` o manifest fixo que força `start_url: "/"`.  
Com o manifest selecionado por rota (AppHead), a página `/auth` passa a “anunciar” um manifest cujo `start_url` é `/auth`, e o iOS deixa de ter motivo para criar o atalho apontando para a raiz.

