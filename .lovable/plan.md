

# Edição inline de telefones inválidos na Etapa 5

## Objetivo

Permitir que o usuário corrija manualmente telefones inválidos diretamente na tabela da Etapa 5 (Validação), sem precisar voltar ao CSV. Ao corrigir o número, o sistema re-normaliza em tempo real e, se válido, move o contato para a lista de válidos.

## Arquivo editado

`src/components/admin/CsvImportModal.tsx`

## Mudancas

### 1. Novo estado para edições manuais

- `phoneEdits: Record<number, string>` — mapeia `rowIndex` para o valor digitado pelo usuário
- Inicializado vazio, preenchido conforme o usuário edita

### 2. Tabela de inválidos — coluna editável

Na tabela de linhas inválidas (dentro do `Collapsible`), a coluna "Telefone" passa de texto estático para um campo `<input>`:

- Input com estilo inline (fundo escuro, borda sutil, fonte mono)
- Valor inicial: `phoneResult.original` do registro inválido
- `onChange`: salva em `phoneEdits[rowIndex]`
- Ao lado do input, um botão/ícone de "Revalidar" que executa `normalizePhone()` no valor editado

### 3. Botão "Revalidar" por linha

- Ícone de refresh/check ao lado do input
- Ao clicar, chama `normalizePhone(phoneEdits[rowIndex], autoFix9thDigit, defaultDdd)`
- Se o resultado for válido:
  - Remove a linha de `invalidRows`
  - Adiciona a `validRows` com o telefone normalizado
  - Atualiza `processResult` no estado
  - Mostra feedback visual (linha fica verde brevemente ou desaparece)
- Se continuar inválido:
  - Mostra o novo erro inline (tooltip ou texto vermelho)

### 4. Botão "Revalidar todos" no header da seção

- Um botão acima da tabela de inválidos: "Revalidar todos editados"
- Percorre todos os `phoneEdits`, re-normaliza cada um
- Move todos os que ficaram válidos para `validRows`
- Atualiza contadores dos MetricCards em tempo real

### 5. Atualização dos contadores

Os MetricCards (Válidos, Inválidos, Corrigidos) refletem as mudanças em tempo real conforme o usuário corrige telefones.

### 6. Fluxo do usuário

```text
1. Usuário vê "15 inválidos" → abre a lista
2. Vê que "051 98051-5224" deu erro → edita para "51980515224"
3. Clica no ícone de revalidar → número fica válido
4. Contadores atualizam: 14 inválidos, +1 válido
5. Segue para Revisão com mais contatos recuperados
```

## Detalhes técnicos

### Função de revalidação por linha

```typescript
const revalidateRow = (invalidIndex: number) => {
  const row = processResult.invalidRows[invalidIndex];
  const editedPhone = phoneEdits[row.rowIndex] || row.phoneResult.original;
  const result = normalizePhone(editedPhone, autoFix9thDigit, defaultDdd);
  
  if (result.isValid && row.name && row.name.length >= 2) {
    // Mover de invalidRows para validRows
    const updatedInvalid = processResult.invalidRows.filter((_, i) => i !== invalidIndex);
    const newValid: RowValidation = {
      ...row,
      phone: result.normalized,
      phoneResult: result,
      isValid: true,
      errors: [],
    };
    const updatedValid = [...processResult.validRows, newValid];
    
    setProcessResult({
      ...processResult,
      invalidRows: updatedInvalid,
      validRows: updatedValid,
      phonesFixed: result.wasFixed 
        ? [...processResult.phonesFixed, newValid] 
        : processResult.phonesFixed,
    });
    // Adicionar o novo índice aos selecionados na Revisão
    setSelectedLeads(prev => new Set([...prev, updatedValid.length - 1]));
  }
};
```

### UI do input inline

```typescript
<td className="p-2">
  <div className="flex items-center gap-1">
    <input
      type="text"
      value={phoneEdits[r.rowIndex] ?? r.phoneResult.original}
      onChange={e => setPhoneEdits(prev => ({ ...prev, [r.rowIndex]: e.target.value }))}
      className="font-mono text-sm bg-[#0f0f12] border border-[#2a2a2e] rounded px-2 py-1 
                 text-white w-36 focus:border-[#FFFF00]/50 focus:outline-none"
    />
    <button onClick={() => revalidateRow(i)} 
            className="text-[#FFFF00] hover:text-[#FFFF00]/80 p-1">
      <Check className="w-3.5 h-3.5" />
    </button>
  </div>
</td>
```

- Erro atualizado exibido na coluna "Erro" se a revalidação falhar
- Linhas recuperadas com sucesso desaparecem da tabela de inválidos

### Arquivo unico editado
- `src/components/admin/CsvImportModal.tsx`
