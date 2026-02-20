

# Adicionar campo "DDD padrão" para números sem DDD

## Problema

Números com 8 ou 9 dígitos (sem DDD) são marcados como inválidos. Em vez de forçar um DDD fixo, o sistema deve pedir ao usuário para informar o DDD padrão na etapa de Regras.

## Solução

### 1. `src/lib/csv-parser.ts`

- Adicionar parâmetro `defaultDdd` (string, ex: "51") à função `normalizePhone(input, autoFix9thDigit, defaultDdd?)`
- No bloco de 8/9 dígitos (linha 175-177): se `defaultDdd` foi informado, aplicar `55 + defaultDdd + digits` e marcar como corrigido com descrição "DDD XX adicionado"
- Se `defaultDdd` não foi informado, manter erro atual "Sem DDD"
- Adicionar `defaultDdd` também às options de `processImportData`

### 2. `src/components/admin/CsvImportModal.tsx`

- Novo estado: `defaultDdd` (string, inicializado vazio)
- Na **Etapa 4 (Regras)**, adicionar um campo de input entre o toggle do 9o dígito e o Empreendimento:
  - Label: "DDD padrão para números sem DDD"
  - Descrição: "Números com 8 ou 9 dígitos receberão este DDD automaticamente"
  - Input numérico, máximo 2 dígitos, placeholder "Ex: 51"
- Passar `defaultDdd` para `processImportData` nas options

## Detalhes técnicos

### `normalizePhone` atualizado:

```typescript
export function normalizePhone(
  input: string, 
  autoFix9thDigit: boolean = true, 
  defaultDdd: string = ""
): PhoneNormResult {
  // ... lógica existente ...
  
  } else if (digits.length === 8 || digits.length === 9) {
    if (defaultDdd && /^\d{2}$/.test(defaultDdd)) {
      digits = "55" + defaultDdd + digits;
      wasFixed = true;
      fixDescription = `DDD ${defaultDdd} adicionado: ${original} → ${digits}`;
    } else {
      return { ..., error: "Sem DDD — informe o DDD padrão na etapa anterior" };
    }
  }
```

### `processImportData` options:

```typescript
options: { autoFix9thDigit: boolean; defaultOrigin: string; defaultDdd: string }
```

### UI na Etapa 4:

```typescript
<div className="space-y-2">
  <Label>DDD padrão para números sem DDD</Label>
  <p className="text-xs text-muted-foreground">
    Números com 8 ou 9 dígitos receberão este DDD (ex: 51, 11, 21)
  </p>
  <Input 
    type="text" maxLength={2} placeholder="Ex: 51"
    value={defaultDdd} onChange={...} 
  />
</div>
```

2 arquivos editados. Nenhuma alteração de banco.

