

## Correção da Barra de Tabs - AdminWhatsApp

### Problema Identificado

A `TabsList` e os `TabsTrigger` na página `/admin/whatsapp` não possuem classes de cor hardcoded, fazendo com que herdem as variáveis CSS semânticas (`bg-muted`, `text-muted-foreground`, `bg-background`, `text-foreground`) que estão com tons marrons do tema antigo.

### Solução

Adicionar as mesmas classes de cores fixas do dark theme que já estão implementadas na página do corretor (`BrokerWhatsApp.tsx`).

### Alterações

**Arquivo:** `src/pages/AdminWhatsApp.tsx`

**TabsList (linha 178):**
```
Antes:  className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex"
Depois: className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex bg-[#1a1a1d] border border-[#2a2a2e]"
```

**Cada TabsTrigger (linhas 179-202):**
Adicionar classes de hover e estado ativo com cores fixas:
```
Antes:  className="gap-2"
Depois: className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white"
```

### Paleta de Cores Aplicada

| Elemento | Cor |
|----------|-----|
| TabsList background | `#1a1a1d` |
| TabsList border | `#2a2a2e` |
| Tab texto inativo | `text-slate-400` |
| Tab ativo background | `#2a2a2e` |
| Tab ativo texto | `text-white` |
| Tab hover texto | `text-white` |

### Resultado Esperado

A barra de tabs terá o mesmo visual dark consistente do resto do painel, sem mais tons marrons.

