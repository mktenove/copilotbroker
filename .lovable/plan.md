
# Auto-calcular Valor/Parcela

## Alteracao

**Arquivo:** `src/components/crm/PropostaModal.tsx`

Modificar a funcao `updateParcela` para que, ao alterar o campo `valor` ou `quantidade_parcelas`, o sistema calcule automaticamente o `valor_parcela` dividindo valor pela quantidade de parcelas.

A logica sera:
- Quando o usuario alterar `valor` ou `quantidade_parcelas`, verificar se ambos os campos tem valores validos
- Se sim, calcular `valor_parcela = valor / quantidade_parcelas` e atualizar automaticamente
- O campo Valor/Parcela continuara editavel manualmente (o usuario pode sobrescrever o calculo)

```typescript
const updateParcela = (id: string, field: keyof ParcelaForm, value: string) => {
  setParcelas(prev => prev.map(p => {
    if (p.id !== id) return p;
    const updated = { ...p, [field]: value };
    // Auto-calculate valor_parcela
    if (field === "valor" || field === "quantidade_parcelas") {
      const val = parseCurrency(field === "valor" ? value : updated.valor);
      const qty = parseInt(field === "quantidade_parcelas" ? value : updated.quantidade_parcelas);
      if (val > 0 && qty > 0) {
        const perInstallment = Math.round((val / qty) * 100);
        updated.valor_parcela = String(perInstallment);
      }
    }
    return updated;
  }));
};
```

Nenhuma outra alteracao necessaria -- o campo continua editavel e os dados sao salvos normalmente.
