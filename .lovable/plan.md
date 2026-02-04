

## Sincronização de Estilos: BrokerWhatsApp

### Contexto

Após verificar os arquivos, confirmei que os **componentes compartilhados** (`ConnectionTab`, `AutoMessageTab`, etc.) já estão atualizados e ambos os painéis os utilizam. A única diferença está nas **cores das tabs** no arquivo de página.

---

### Alteração Necessária

**Arquivo:** `src/pages/BrokerWhatsApp.tsx`

Atualizar a cor do texto das tabs inativas de `text-slate-300` para `text-slate-400` e adicionar `hover:text-white` para manter consistência com o painel admin.

---

### Código Atual (linhas 87-121)

```tsx
<TabsTrigger 
  value="connection" 
  className="text-slate-300 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white flex items-center gap-2"
>
```

### Código Atualizado

```tsx
<TabsTrigger 
  value="connection" 
  className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
>
```

Aplicar a mesma alteração em todas as 5 tabs (connection, campaigns, queue, security, automation).

---

### Sobre o Botão "Atualizar"

O painel admin tem o botão "Atualizar" no header porque gerencia **todas as instâncias** de todos os corretores. O painel do corretor gerencia apenas **sua própria instância**, então não precisa desse botão global - o botão dentro do `ConnectionTab` já é suficiente para seu caso de uso.

---

### Resultado

- ✅ Cores das tabs alinhadas entre Admin e Broker (`text-slate-400`)
- ✅ Hover state adicionado (`hover:text-white`)
- ✅ Componentes compartilhados já sincronizados automaticamente

