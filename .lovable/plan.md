

# Corrigir animacao de contorno verde (Cadencia Ativa) no KanbanCard

## Problema

A animacao `ring-pulse` esta definida como keyframe no `tailwind.config.ts`, porem o card aplica via **estilo inline** (`style={{ animation: "ring-pulse 4s ease-in-out infinite" }}`). O Tailwind so gera o CSS de um keyframe quando a classe correspondente (`animate-ring-pulse`) e utilizada em algum lugar do codigo. Como nenhum elemento usa `className="animate-ring-pulse"`, o `@keyframes ring-pulse` nunca e emitido no CSS final, e a animacao nao funciona.

O mesmo vale para `dot-pulse`.

## Solucao

Mover as definicoes dos keyframes `ring-pulse` e `dot-pulse` para o arquivo `src/index.css` como CSS puro. Isso garante que os keyframes estejam sempre disponiveis, independente de o Tailwind gerar ou nao as classes utilitarias.

## Alteracoes

### Arquivo: `src/index.css`

Adicionar os keyframes diretamente no CSS global:

```css
@keyframes ring-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.6); }
  50% { box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.15); }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}
```

Nenhuma outra alteracao e necessaria — os estilos inline no `KanbanCard.tsx` ja referenciam esses nomes de keyframe corretamente.

