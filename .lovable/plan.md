

## Mover resumo de mensagens para o final do formulario

### O que muda

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

1. **Remover** o bloco "Lead Count Summary" da posicao atual (linhas 493-513), que fica entre a lista de leads e a sequencia de mensagens
2. **Adicionar** uma versao minimalista desse resumo logo apos o botao "Adicionar etapa" (apos linha 624), como ultima coisa antes do footer
3. O novo layout sera uma linha simples de texto sem o quadrado amarelo (`bg-primary/10 border border-primary/20`), sem icone `Users`, apenas texto discreto

### Novo visual

```text
12 leads x 2 etapas = 24 mensagens · ~45min
```

- Texto pequeno (`text-xs`), cor `text-slate-400`
- Sem borda, sem background, sem icone
- Duracao estimada na mesma linha separada por ` · `
- Centralizado (`text-center`)

### O que NAO muda
- Calculo de `selectedCount`, `totalMessages`, `estimatedTime`
- Restante do formulario permanece igual

