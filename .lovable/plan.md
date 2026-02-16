

# Corrigir safe area na pagina do Lead

## Problema
A pagina dedicada do Lead (`/corretor/lead/:id`) nao recebeu a classe `pt-safe` no header sticky, fazendo com que o nome do lead, botao de voltar e barra de progresso do funil fiquem sobrepostos a barra de status do iPhone (bateria, wifi, horario).

## Alteracao

**Arquivo:** `src/pages/LeadPage.tsx`

Adicionar a classe `pt-safe` ao header sticky (linha 304):

```
// De:
<div className="sticky top-0 z-30 bg-[#0f0f12]/95 backdrop-blur-xl border-b border-[#1e1e22]">

// Para:
<div className="sticky top-0 z-30 bg-[#0f0f12]/95 backdrop-blur-xl border-b border-[#1e1e22] pt-safe">
```

Isso utiliza a mesma classe utilitaria `pt-safe` (que usa `env(safe-area-inset-top)`) ja aplicada nos demais headers do projeto. Em dispositivos sem notch, nada muda.

