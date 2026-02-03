
# Plano: Adicionar Página /admin à Tela Inicial do iPhone

## O Problema

O iOS Safari possui uma **limitação conhecida**: ele **ignora completamente o `start_url` do manifest.json**. Quando você clica em "Adicionar à Tela de Início", o Safari usa a **URL atual da aba**, não a definida no manifest.

Mesmo tendo o `manifest-crm.json` configurado com `"start_url": "/admin"`, se você estiver na raiz (`/`) quando adicionar à tela inicial, o atalho vai abrir na raiz.

## Solução

Para adicionar a página `/admin` à tela inicial do iPhone, você precisa:

1. **Navegar para `/admin` no Safari** antes de adicionar
2. **Garantir que o manifest correto seja carregado** na página /admin
3. **Configurar meta tags PWA específicas** para a página admin

O código já está parcialmente correto (o Admin.tsx usa `react-helmet-async` para injetar o manifest-crm.json), mas há ajustes necessários para garantir que funcione.

## Mudanças Necessárias

### 1. Atualizar `manifest-crm.json`
Adicionar `scope` para limitar o escopo do PWA à área admin:

```json
{
  "name": "CRM Enove",
  "short_name": "CRM",
  "description": "Sistema de Gestão de Leads - Enove Imobiliária",
  "start_url": "/admin",
  "scope": "/admin",
  "display": "standalone",
  "background_color": "#0f0f12",
  "theme_color": "#FFFF00",
  "icons": [...]
}
```

### 2. Criar ícone específico para o CRM (Opcional mas recomendado)
Criar um ícone PNG de 180x180 específico para o CRM, diferente do favicon geral da Enove.

### 3. Adicionar `apple-touch-icon` específico no Admin.tsx
Garantir que o ícone correto seja usado no atalho da tela inicial.

### 4. Instrução para o Usuário

**Passo a passo correto para adicionar /admin à tela inicial:**

1. Abra o Safari no iPhone
2. Navegue para `https://onovocondominio.lovable.app/admin`
3. Faça login se necessário
4. **Aguarde a página /admin carregar completamente**
5. Toque no ícone de compartilhar (quadrado com seta para cima)
6. Role para baixo e toque em "Adicionar à Tela de Início"
7. O nome sugerido deve ser "CRM" - confirme

O atalho agora abrirá diretamente em `/admin`.

## Arquivos a Modificar

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `public/manifest-crm.json` | Modificar | Adicionar `scope: "/admin"` |
| `src/pages/Admin.tsx` | Modificar | Adicionar `apple-touch-icon` específico via Helmet |
| `public/manifest-crm-broker.json` | Modificar | Adicionar `scope: "/corretor"` |
| `src/pages/BrokerAdmin.tsx` | Modificar | Adicionar `apple-touch-icon` específico |

## Detalhes Técnicos

### Admin.tsx - Meta Tags Atualizadas

```tsx
<Helmet>
  <title>CRM | Enove</title>
  <link rel="manifest" href="/manifest-crm.json" />
  <link rel="apple-touch-icon" href="/favicon-enove.jpg" />
  <meta name="apple-mobile-web-app-title" content="CRM" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#0f0f12" />
</Helmet>
```

### manifest-crm.json Atualizado

```json
{
  "name": "CRM Enove",
  "short_name": "CRM",
  "description": "Sistema de Gestão de Leads - Enove Imobiliária",
  "start_url": "/admin",
  "scope": "/admin",
  "id": "/admin",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f0f12",
  "theme_color": "#FFFF00",
  "icons": [
    {
      "src": "/favicon-enove.jpg",
      "sizes": "192x192",
      "type": "image/jpeg",
      "purpose": "any"
    },
    {
      "src": "/favicon-enove.jpg",
      "sizes": "512x512",
      "type": "image/jpeg",
      "purpose": "any"
    }
  ]
}
```

## Importante: Limitação do iOS

Mesmo com todas essas configurações, o iOS Safari:
- **Usa a URL atual** (não o `start_url`) quando você adiciona à tela inicial
- **Por isso é essencial estar em `/admin`** quando você adiciona o atalho

O `start_url` no manifest serve principalmente para:
- Android/Chrome PWA
- Quando o usuário já tem o PWA instalado e abre novamente

## Resumo da Solução

1. **Navegar para `/admin` antes de adicionar**
2. **Atualizar o manifest com `scope` e `id`**
3. **Garantir que as meta tags Apple estão corretas**

Após implementar, o fluxo será:
- Você acessa `/admin` no Safari
- Adiciona à tela inicial
- O atalho "CRM" abre diretamente em `/admin` em modo standalone
