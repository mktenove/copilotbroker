

## Persistir Origens Personalizadas no CRM

### Problema
Quando o usuario cria uma origem personalizada (ex: "Carteira pessoal", "Flip"), ela e salva apenas no lead individual. Ao atribuir origem a outro lead, as origens personalizadas nao aparecem na lista - o usuario precisa digitar novamente.

### Solucao
Buscar todas as origens distintas ja utilizadas na tabela `leads` e exibi-las automaticamente nos seletores de origem (Combobox desktop e QuickPicker mobile), em uma secao separada chamada "Usadas anteriormente". Isso elimina a necessidade de uma nova tabela - as origens personalizadas ja estao salvas nos leads.

### Como vai funcionar
Ao abrir o seletor de origem, o sistema busca todas as `lead_origin` distintas dos leads e filtra as que nao sao pre-definidas (como meta_ads, google_ads, etc). Essas origens aparecem em uma secao "Personalizadas" abaixo das origens padrao.

### Detalhes tecnicos

**1. Novo hook `src/hooks/use-custom-origins.ts`**

Hook simples que busca origens distintas do banco e filtra as pre-definidas:

```typescript
// Query: SELECT DISTINCT lead_origin FROM leads WHERE lead_origin IS NOT NULL
// Filtrar: remover origens que ja existem em LEAD_ORIGINS
// Retornar: array de strings com origens customizadas
```

Usa `useQuery` com `staleTime` alto (5 min) para nao fazer queries excessivas.

**2. Atualizar `src/components/crm/OriginCombobox.tsx`**

- Importar e usar o hook `useCustomOrigins`
- Adicionar um novo `CommandGroup` chamado "Personalizadas" abaixo das origens padrao
- Listar as origens customizadas com icone de marcador (tag)
- Manter o campo "Usar [texto digitado]" para criar novas origens

**3. Atualizar `src/components/crm/OriginQuickPicker.tsx`**

- Importar e usar o hook `useCustomOrigins`
- Adicionar uma nova secao "Personalizadas" no drawer, entre as origens padrao e o input customizado
- Usar estilo visual distinto (cor slate/cinza) para diferenciar das categorias padrao

Nenhuma mudanca no banco de dados necessaria. As origens ja estao persistidas na coluna `lead_origin` da tabela `leads`.
