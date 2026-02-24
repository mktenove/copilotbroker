
# Correção: URL duplicada "prontos/prontos" para corretores

## Problema

O projeto "Imóveis Prontos" tem `city_slug = "prontos"` e `slug = "prontos"` no banco de dados. A lógica de geração de URL no hook `use-broker-projects.ts` monta o link como `/{city_slug}/{slug}/{brokerSlug}`, resultando em `/prontos/prontos/nomedocorretor`.

Porém, a rota real definida no `App.tsx` é `/prontos/:brokerSlug` (sem prefixo de cidade). O link gerado leva a uma página errada porque bate na rota genérica `/:citySlug/:projectSlug/:brokerSlug`.

## Solução

Adicionar tratamento especial para o projeto "Prontos" na geração de URLs, similar ao que já existe para "estanciavelha". Isso afeta **3 pontos** no arquivo `src/hooks/use-broker-projects.ts`:

1. **Linha 72-74** (geração de URL no fetch): adicionar condição para `slug === "prontos"` retornando `/prontos/{broker.slug}`
2. **Linha 209-211** (atualização de URL ao mudar slug): mesma condição
3. **Linha 243-244** (função `getProjectUrl`): mesma condição

## Detalhes Técnicos

Arquivo: `src/hooks/use-broker-projects.ts`

Lógica atual (3 locais):
```text
if (project.slug === "estanciavelha") {
  return `/estanciavelha/${broker.slug}`;
}
return `/${project.city_slug}/${project.slug}/${broker.slug}`;
```

Lógica corrigida:
```text
if (project.slug === "estanciavelha") {
  return `/estanciavelha/${broker.slug}`;
}
if (project.slug === "prontos") {
  return `/prontos/${broker.slug}`;
}
return `/${project.city_slug}/${project.slug}/${broker.slug}`;
```

Nenhuma alteração de banco de dados ou migração é necessária.
