
## Objetivo
Alterar a criação de instâncias WhatsApp para usar o **nome do corretor** no lugar do formato atual `enove_broker_{id}`.

---

## Exemplo

| Antes | Depois |
|-------|--------|
| `enove_broker_68db81c3` | `enove_maicon` |
| `enove_broker_4272e89e` | `enove_marcio_cardoso` |

---

## Alterações Técnicas

### 1. Criar função auxiliar para normalizar nome

Nomes de instâncias UAZAPI precisam ser seguros (sem espaços, acentos ou caracteres especiais). Vamos criar uma função que:
- Remove acentos (ex: "Márcio" → "marcio")
- Converte para minúsculas
- Substitui espaços por underscore
- Remove caracteres especiais
- Limita o tamanho para evitar nomes muito longos

```typescript
const normalizeInstanceName = (name: string): string => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/\s+/g, "_")            // Espaços → underscore
    .replace(/[^a-z0-9_]/g, "")      // Remove caracteres especiais
    .substring(0, 30);               // Limita tamanho
};
```

### 2. Modificar `getBrokerId` para retornar nome também

**Antes:**
```typescript
const getBrokerId = async (...): Promise<string> => {
  // ...select("id")...
  return data.id;
};
```

**Depois:**
```typescript
interface BrokerInfo {
  id: string;
  name: string;
}

const getBrokerInfo = async (...): Promise<BrokerInfo> => {
  // ...select("id, name")...
  return { id: data.id, name: data.name };
};
```

### 3. Atualizar geração do nome da instância

**Antes:**
```typescript
const brokerId = await getBrokerId(supabase, user.id);
const instanceName = `enove_broker_${brokerId.substring(0, 8)}`;
```

**Depois:**
```typescript
const brokerInfo = await getBrokerInfo(supabase, user.id);
const safeName = normalizeInstanceName(brokerInfo.name);
const instanceName = `enove_${safeName}`;
```

---

## Exemplos de Conversão

| Nome do Corretor | Nome da Instância |
|-----------------|-------------------|
| Maicon | `enove_maicon` |
| Márcio Cardoso | `enove_marcio_cardoso` |
| Kely Monique | `enove_kely_monique` |
| VILSON SILVA | `enove_vilson_silva` |
| Bibiana Malheiros | `enove_bibiana_malheiros` |

---

## Arquivos a serem alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Adicionar `normalizeInstanceName()`, modificar `getBrokerId` → `getBrokerInfo`, atualizar geração de nome |

---

## Observações

1. **Instâncias existentes não serão afetadas** - A mudança só se aplica a novas instâncias criadas
2. **Unicidade garantida** - Cada corretor só pode ter uma instância, então nomes como "enove_maicon" serão únicos
3. **Fallback seguro** - Se o nome vier vazio, podemos usar o ID como fallback
