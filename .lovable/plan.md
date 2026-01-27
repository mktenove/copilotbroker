

# Plano: Manifest Dedicado para CRM Admin

## Problema

Quando você adiciona `/admin` à tela inicial do iPhone:
1. O atalho abre a página raiz `/` em vez de `/admin`
2. O nome do atalho aparece como "Enove" em vez de "CRM"

Isso acontece porque o manifest.json atual tem `start_url: "/"` e `short_name: "Enove"`.

## Solução

Criar um manifest dedicado para o CRM e injetá-lo dinamicamente apenas nas páginas de admin.

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `public/manifest-crm.json` | Manifest específico para o CRM Admin |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Admin.tsx` | Adicionar meta tags via React Helmet para usar manifest-crm.json |
| `src/pages/BrokerAdmin.tsx` | Adicionar meta tags via React Helmet para usar manifest-crm.json |

## Detalhes Técnicos

### 1. Criar manifest-crm.json

```json
{
  "name": "CRM Enove",
  "short_name": "CRM",
  "description": "Sistema de Gestão de Leads - Enove Imobiliária",
  "start_url": "/admin",
  "display": "standalone",
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

### 2. Adicionar Helmet nas páginas Admin

Usar react-helmet-async para sobrescrever o link do manifest quando estiver nas páginas de admin:

```typescript
import { Helmet } from "react-helmet-async";

// Dentro do componente Admin
<Helmet>
  <title>CRM | Enove</title>
  <link rel="manifest" href="/manifest-crm.json" />
  <meta name="apple-mobile-web-app-title" content="CRM" />
</Helmet>
```

### 3. Para BrokerAdmin

O corretor também terá seu próprio manifest ou usará o mesmo manifest-crm.json com `start_url: "/corretor/admin"`:

Opção escolhida: Criar `manifest-crm-broker.json` com `start_url: "/corretor/admin"` para que corretores também possam adicionar o atalho correto.

## Resultado Esperado

- **Admin principal**: Ao adicionar `/admin` à tela inicial, abrirá `/admin` com nome "CRM"
- **Admin corretor**: Ao adicionar `/corretor/admin` à tela inicial, abrirá `/corretor/admin` com nome "CRM"
- **Demais páginas**: Continuam usando o manifest padrão com start_url "/" e nome "Enove"

