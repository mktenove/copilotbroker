

# Redesign da Aba Seguranca

## Visao geral

Transformar a aba Seguranca de uma lista vertical de cards genericos em um layout profissional e minimalista, com hierarquia visual clara, usando a paleta escura do projeto (#0f0f12, #1e1e22, #141417) e detalhes sutis que remetam protecao.

## Nova estrutura do layout

### 1. Header com Status Geral (substitui o card de Aquecimento)
Uma barra horizontal compacta no topo com:
- Indicador de status (circulo verde/vermelho pulsante) + texto "Protegido" ou "Pausado"
- Aquecimento dia X/14 inline
- Botao Kill Switch discreto a direita (texto + icone, sem card separado)

### 2. Grid 2 colunas (desktop) / stack (mobile)

**Coluna esquerda - Controles:**
- Secao "Limites" com sliders de hora/dia e horario de envio, sem card wrapper -- apenas divisores finos entre blocos
- Botao salvar discreto

**Coluna direita - Monitoramento:**
- Grafico de 7 dias (DailyStatsChart) compacto
- Lista de erros recentes (ErrorLogsCard) simplificada

### 3. Rodape - Regras ativas
Substituir o card de regras por uma linha unica colapsavel ou uma lista horizontal de badges/pills discretos em slate, sem card.

### 4. Opt-outs
Mover para dentro de um accordion/collapsible discreto no final, ja que e uma lista secundaria.

## Detalhes visuais

- Remover todos os Cards com fundo colorido (amarelo do warmup, vermelho do kill switch)
- Usar bordas ultrafinas (#2a2a2e) como separadores em vez de cards empilhados
- Kill switch: botao pequeno com borda vermelha sutil, nao um card inteiro
- Regras anti-spam: pills/badges inline em vez de lista vertical com checks
- Icones em slate-500, nao coloridos (exceto status indicators)
- Tipografia compacta, sem CardTitle grande -- usar `text-sm font-medium text-slate-300` para labels de secao

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/SecurityTab.tsx` | Reescrever layout completo |

Os sub-componentes (DailyStatsChart, OptoutsList, ErrorLogsCard) permanecem inalterados -- apenas reorganizados dentro do novo layout.

## Detalhes tecnicos

- Layout grid: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Status bar: `div` com `flex items-center justify-between` e borda inferior fina
- Regras anti-spam como badges: `span` com `bg-[#1e1e22] text-slate-400 text-xs px-3 py-1 rounded-full border border-[#2a2a2e]`
- Kill switch compacto: `Button variant="ghost"` com `border border-red-500/20 text-red-400` no estado normal, e `border-green-500/20 text-green-400` quando pausado
- Opt-outs dentro de `Collapsible` do Radix para manter a pagina limpa
- Remover import de `Progress` (warmup bar removida) e `Card/CardHeader/CardTitle` do componente principal (sub-componentes mantem os proprios)

