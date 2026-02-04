

## Remoção do Botão Atualizar Duplicado

### Problema Identificado

No componente `WhatsAppOverviewTab.tsx`, existe um botão "Atualizar" nas **linhas 121-131** que está criando espaço desnecessário entre a barra de tabs e os cards de estatísticas (Instâncias, Online, Enviados Hoje, Taxa Resp.).

Este botão é **redundante** porque já existe um botão "Atualizar" no header principal da página (ao lado do título "WhatsApp - Atendimento Assistido").

---

### Alteração

**Arquivo:** `src/components/admin/WhatsAppOverviewTab.tsx`

Remover o bloco das linhas 121-131:

```tsx
// REMOVER ESTE BLOCO
{/* Header */}
<div className="flex items-center justify-end">
  <Button
    variant="outline"
    onClick={() => refetchInstances()}
    className="bg-[#1a1a1d] border-[#2a2a2e]"
  >
    <RefreshCw className="w-4 h-4 mr-2" />
    Atualizar
  </Button>
</div>
```

---

### Resultado Esperado

- Os cards de estatísticas (Instâncias, Online, etc.) ficarão logo abaixo das tabs, sem espaço vazio entre eles
- O botão "Atualizar" permanece funcional no header da página

