
# Redesign Mobile-First da Aba "Fila de Envio"

## Diagnostico UX/UI Atual

### Problemas identificados no mobile:

1. **Header em linha unica**: O titulo "Fila de Envio" e o contador "Proximo envio em: X:XX" dividem a mesma linha horizontal, causando overflow ou texto comprimido em telas < 390px.

2. **Stats grid ocupa espaco excessivo**: Os 4 cards de estatisticas (Na fila, Enviados, Falhas, Respostas) empilham verticalmente no mobile (1 por linha), consumindo quase toda a viewport antes do usuario ver qualquer mensagem da fila.

3. **Cards de mensagem com layout horizontal apertado**: Cada card tenta alinhar nome + badge + horario + botao de acao em uma unica linha horizontal. Em telas estreitas, os elementos competem por espaco e o botao de cancelar/retry pode ficar difícil de tocar.

4. **Sem safe-area para bottom nav**: O conteudo pode ficar escondido atras da barra de navegacao inferior.

5. **Empty state nao otimizado**: O estado vazio nao aproveita a altura disponivel no mobile.

---

## Solucao Proposta

### 1. Header responsivo com countdown em destaque

- Mobile: stack vertical -- titulo na primeira linha, countdown abaixo com fundo destacado (pill com bg)
- Desktop: manter lado a lado
- O countdown ganha mais destaque visual: um "pill" com fundo escuro e borda, icone de timer pulsante

### 2. Stats compactos em linha unica (2x2 grid)

- Substituir os 4 cards separados por um grid 2x2 no mobile (`grid-cols-2`) e 4 colunas no desktop (`sm:grid-cols-4`)
- Cards menores: reduzir padding vertical, manter apenas numero + label
- Isso reduz o espaco consumido pela metade no mobile

### 3. Cards de mensagem reestruturados

**Pendentes (mobile):**
- Layout vertical dentro do card
- Linha 1: nome do lead (truncado) + badge de status
- Linha 2: nome da campanha + horario agendado
- Linha 3 (separada por borda): botao de cancelar alinhado a direita, com icone + texto "Cancelar" para melhor affordance

**Historico (mobile):**
- Layout vertical similar
- Linha 1: icone de status + nome do lead + badge
- Linha 2: mensagem de erro (se falhou) ou horario de envio
- Linha 3: botao retry para mensagens com falha

### 4. Secao de historico com limite e "ver mais"

- Manter o slice(0, 20) mas adicionar um indicador visual quando ha mais mensagens
- Separador visual mais claro entre Pendentes e Historico

### 5. Bottom padding para safe-area

- Adicionar `pb-20` ao container principal para evitar sobreposicao com a bottom nav

---

## Detalhes Tecnicos

### Arquivo: `src/components/whatsapp/QueueTab.tsx`

**Header (linhas 49-55):**
```text
Antes:  flex items-center justify-between (tudo horizontal)
Depois: flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between
        Countdown em pill: bg-[#1a1a1d] border border-[#2a2a2e] rounded-full px-3 py-1
```

**Stats Grid (linhas 58-83):**
```text
Antes:  grid gap-4 md:grid-cols-4 (1 coluna no mobile = 4 cards empilhados)
Depois: grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4
        Cards com py-3 em vez de py-4 (mais compactos)
```

**Cards pendentes (linhas 104-141):**
```text
Antes:  flex items-center gap-4 p-3 (horizontal, tudo em uma linha)
Depois: flex flex-col p-3 (vertical no mobile)
        Topo: flex items-center justify-between
          -> Esquerda: nome do lead (truncado)
          -> Direita: badge de status
        Meio: flex items-center justify-between mt-1
          -> Esquerda: nome da campanha (text-xs)
          -> Direita: horario (text-xs)
        Rodape: flex justify-end mt-2 pt-2 border-t border-[#2a2a2e]
          -> Botao cancelar com texto visivel no mobile
```

**Cards historico (linhas 148-204):**
```text
Antes:  flex items-center gap-4 (horizontal)
Depois: flex flex-col p-3 (vertical no mobile)
        Topo: flex items-center gap-2
          -> Icone de status (check/alerta/x)
          -> Nome do lead (flex-1, truncado)
          -> Badge de status
        Meio (condicional): erro ou horario
        Rodape (condicional): botao retry para falhas
          -> Botao com texto "Tentar novamente" no mobile
```

**Container principal (linha 48):**
```text
Antes:  space-y-6
Depois: space-y-4 sm:space-y-6 pb-20 sm:pb-0
        (espacamento menor no mobile + safe-area)
```

---

## Resultado Esperado

- No mobile (390px): stats em 2x2 ocupam metade do espaco anterior
- Header com countdown em pill destacado, facil de ler
- Cards de mensagem verticais com acoes claras e acessiveis pelo polegar
- Safe-area para bottom nav -- conteudo nao fica escondido
- No desktop: layout preservado sem regressoes visuais
