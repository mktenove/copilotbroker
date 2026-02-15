

# Adicionar safe area no topo para dispositivos com notch (iPhone)

## Problema
Em dispositivos como iPhone 15 Pro (com Dynamic Island/notch), o conteudo do topo das paginas fica sobreposto a barra de status do sistema (bateria, wifi, horario). Isso afeta:
- Botoes de fechar (X) nos Sheets e Dialogs
- Headers fixos/sticky (Admin, Broker, landing pages)
- Qualquer conteudo posicionado no topo absoluto

O `viewport-fit=cover` ja esta configurado no `index.html`, mas nenhum CSS utiliza `env(safe-area-inset-top)` para compensar o espaco da barra de status.

## Solucao

Abordagem centralizada: adicionar utilitarios CSS globais e aplicar nos componentes afetados.

### 1. `src/index.css` -- Criar utilitarios de safe area

Adicionar classes utilitarias `pt-safe` e `top-safe` que usam `env(safe-area-inset-top)`:

```css
@layer utilities {
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
  }
  .top-safe {
    top: env(safe-area-inset-top, 0px);
  }
}
```

### 2. `src/components/ui/sheet.tsx` -- Safe area no botao de fechar e padding

- Adicionar `pt-safe` ao `SheetContent` para que o conteudo interno respeite o notch
- O botao de fechar (X) ja esta posicionado com `top-3`, mas com o padding do container ele ficara abaixo da barra de status automaticamente

### 3. `src/components/ui/dialog.tsx` -- Safe area nos dialogs mobile

- Adicionar padding-top seguro para dialogs que ocupam tela cheia no mobile

### 4. `src/components/admin/AdminHeader.tsx` -- Safe area no header sticky

- Adicionar `pt-safe` ao header no mobile para empurrar o conteudo abaixo da barra de status

### 5. `src/components/broker/BrokerHeader.tsx` -- Mesmo ajuste

- Adicionar `pt-safe` ao header do broker

### 6. Headers das landing pages

Aplicar nos headers fixos:
- `src/components/Header.tsx` (Estancia Velha)
- `src/components/goldenview/GVHeader.tsx`
- `src/components/mauriciocardoso/MCHeader.tsx`

Cada um recebera a classe `pt-safe` para que o conteudo do header nao fique sob o notch.

### 7. `src/components/admin/AdminLayout.tsx` e `src/components/broker/BrokerLayout.tsx`

- Adicionar `pt-safe` no container principal no mobile para garantir que todo o conteudo comece abaixo da safe area

## Resumo das alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Adicionar utilitarios `.pt-safe` e `.top-safe` |
| `src/components/ui/sheet.tsx` | Adicionar `pt-safe` ao SheetContent |
| `src/components/admin/AdminHeader.tsx` | Adicionar `pt-safe` ao header mobile |
| `src/components/broker/BrokerHeader.tsx` | Adicionar `pt-safe` ao header mobile |
| `src/components/admin/AdminLayout.tsx` | Adicionar `pt-safe` no wrapper mobile |
| `src/components/broker/BrokerLayout.tsx` | Adicionar `pt-safe` no wrapper mobile |
| `src/components/Header.tsx` | Adicionar `pt-safe` ao header fixo |
| `src/components/goldenview/GVHeader.tsx` | Adicionar `pt-safe` ao header fixo |
| `src/components/mauriciocardoso/MCHeader.tsx` | Adicionar `pt-safe` ao header fixo |

## Resultado
- Em dispositivos sem notch: nenhuma mudanca visual (fallback `0px`)
- Em dispositivos com notch/Dynamic Island: conteudo do topo tera espaco suficiente, botoes de fechar ficarao acessiveis, e nenhuma informacao ficara sobreposta a barra de status
