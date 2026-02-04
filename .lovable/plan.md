

## Correção das Tabs e Espaçamento - WhatsApp

### Problemas Identificados

Analisando a imagem e o código, identifiquei dois problemas:

---

### Problema 1: Cor das Tabs Inativas

**Causa:** O componente base `TabsTrigger` em `src/components/ui/tabs.tsx` tem a classe `text-muted-foreground` hardcoded, que está sobrescrevendo a classe `text-slate-400` que adicionamos.

**No CSS (`index.css`):**
- `--muted-foreground: 40 10% 60%` (dark mode) = tom bege/marrom

**Solução:** Usar `!text-slate-300` (com `!` para forçar prioridade) ou remover a classe base do componente para as tabs WhatsApp.

---

### Problema 2: Espaço entre Blocos

**Causa:** O card "Status da Conexão" está usando `space-y-4` internamente, e o botão "Atualizar" dentro do `CardContent` pode estar criando espaço visual. Além disso, o `grid gap-6` entre os cards está correto, mas pode parecer grande.

Olhando o código do `ConnectionTab.tsx`:
- Linha 143: há um `pt-4 border-t` que adiciona padding no topo
- O botão "Atualizar" sempre aparece (linha 144-153)

---

### Alterações Propostas

#### 1. `src/pages/BrokerWhatsApp.tsx` - Corrigir cor das tabs

Adicionar cor explícita com prioridade nas tabs inativas:

```tsx
// Cada TabsTrigger precisa de cor visível
<TabsTrigger 
  value="connection" 
  className="text-slate-300 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white flex items-center gap-2"
>
```

#### 2. `src/pages/AdminWhatsApp.tsx` - Corrigir cor das tabs

Mesma alteração - usar `text-slate-300` em vez de `text-slate-400`:

```tsx
<TabsTrigger 
  value="overview" 
  className="gap-2 text-slate-300 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white"
>
```

#### 3. `src/components/whatsapp/ConnectionTab.tsx` - Ajustar espaçamento

Reduzir o padding do border-top dos botões de ação:

```tsx
// Linha 143: mudar pt-4 para pt-3
<div className="flex flex-wrap gap-2 pt-3 border-t border-[#2a2a2e]">
```

---

### Resumo das Alterações

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `src/pages/BrokerWhatsApp.tsx` | 87-120 | Adicionar `text-slate-300` nas 5 TabsTrigger |
| `src/pages/AdminWhatsApp.tsx` | 179-202 | Manter `text-slate-300` (já está, verificar se funciona) |
| `src/components/whatsapp/ConnectionTab.tsx` | 143 | Mudar `pt-4` para `pt-3` |

---

### Resultado Esperado

- Texto das tabs inativas ficará visível em cinza claro (`slate-300`)
- Tabs ativas continuarão brancas com background escuro
- Espaçamento reduzido entre a área de status e os botões de ação

