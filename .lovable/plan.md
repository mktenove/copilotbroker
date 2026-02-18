# Aumentar velocidade da animacao ring-pulse

## Alteracao

No arquivo `src/index.css`, reduzir a duracao da animacao `ring-pulse` nao e possivel diretamente nos keyframes (a duracao e controlada no componente). Porem, o `KanbanCard.tsx` define a duracao inline como `4s`. 

### Arquivo: `src/components/crm/KanbanCard.tsx`

Alterar as constantes `RING_PULSE_STYLE` e `RING_PULSE_GLOW_STYLE` de `4s` para `3s`:

```typescript
const RING_PULSE_STYLE: React.CSSProperties = {
  animation: "ring-pulse 3s ease-in-out infinite",
};
const RING_PULSE_GLOW_STYLE: React.CSSProperties = {
  animation: "ring-pulse 3s ease-in-out infinite",
  boxShadow: "0 0 20px rgba(52,211,153,0.3)",
};
```

Isso fara a piscada completar um ciclo em 3 segundos em vez de 4, tornando-a visivelmente mais rapida sem ficar agressiva.