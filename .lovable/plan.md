

# Plano: Manter Link Legado para Estância Velha

## Contexto

O projeto "O Novo Condomínio" de Estância Velha tinha o formato de URL legado `/estanciavelha/:brokerSlug`, mas a implementação multi-projeto mudou para `/{city_slug}/{project_slug}/{broker_slug}`.

Para manter compatibilidade, o empreendimento "estanciavelha" deve continuar usando o formato antigo `/estanciavelha/:brokerSlug`.

## Solucao

Criar uma funcao helper que verifica se o projeto e "estanciavelha" e retorna o URL no formato correto:

```typescript
const getProjectUrlForBroker = (project: Project, brokerSlug: string) => {
  // Caso especial: Estancia Velha usa formato legado
  if (project.slug === "estanciavelha") {
    return `/estanciavelha/${brokerSlug}`;
  }
  // Formato padrao para outros projetos
  return `/${project.city_slug}/${project.slug}/${brokerSlug}`;
};
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/use-broker-projects.ts` | Atualizar funcao `getProjectUrl` e geracao de URLs em `fetchBrokerProjects` e `updateSlug` |
| `src/pages/BrokerSignup.tsx` | Atualizar funcao `getProjectUrl` na etapa de selecao de projetos |
| `src/pages/BrokerProjects.tsx` | Atualizar geracao de URLs (se houver alguma geracao inline) |

## Detalhes Tecnicos

### 1. use-broker-projects.ts

Modificar linha 72 e 207:
```typescript
// Linha 72 - fetchBrokerProjects
url: project.slug === "estanciavelha" 
  ? `/estanciavelha/${broker.slug}`
  : `/${project.city_slug}/${project.slug}/${broker.slug}`,

// Linha 207 - updateSlug
url: bp.project.slug === "estanciavelha"
  ? `/estanciavelha/${newSlug}`
  : `/${bp.project.city_slug}/${bp.project.slug}/${newSlug}`,

// Linha 239 - getProjectUrl
const getProjectUrl = (project: Project) => {
  if (!broker) return "";
  if (project.slug === "estanciavelha") {
    return `/estanciavelha/${broker.slug}`;
  }
  return `/${project.city_slug}/${project.slug}/${broker.slug}`;
};
```

### 2. BrokerSignup.tsx

Modificar funcao `getProjectUrl` (linha 222-224):
```typescript
const getProjectUrl = (project: Project) => {
  if (project.slug === "estanciavelha") {
    return `/estanciavelha/${profileData.slug}`;
  }
  return `/${project.city_slug}/${project.slug}/${profileData.slug}`;
};
```

## Resultado Esperado

- Links de Estancia Velha: `/estanciavelha/kely`
- Links de GoldenView: `/portao/goldenview/kely`
- Links de outros projetos futuros: `/{city_slug}/{project_slug}/{broker_slug}`

