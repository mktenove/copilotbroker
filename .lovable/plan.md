

# Barra de progresso interativa na pagina do Lead

## Conceito

Transformar a barra de progresso do funil (atualmente apenas visual) em um elemento interativo onde o usuario pode clicar na **proxima etapa** para acionar a acao correspondente. Isso permite movimentar o lead diretamente pela barra, refletindo no kanban via realtime.

## Comportamento

Cada segmento da barra tera comportamento diferente baseado na posicao relativa ao estagio atual:

| Segmento | Visual | Clique |
|----------|--------|--------|
| Etapas anteriores | Amarelo escuro, cursor default | Nada (tooltip "Etapa concluida") |
| Etapa atual | Amarelo brilhante com glow | Nada (tooltip "Etapa atual") |
| Proxima etapa | Borda pulsante, cursor pointer | Abre o modal/acao correspondente |
| Etapas futuras | Cinza, cursor not-allowed | Nada (tooltip "Complete a etapa anterior") |

### Mapeamento de acoes por clique na proxima etapa

- **Clicar em "Atendimento"** (estando em Pre Atend.) -> Abre modal de Iniciar Atendimento
- **Clicar em "Agendamento"** (estando em Atendimento) -> Abre modal de Agendamento
- **Clicar em "Proposta"** (estando em Agendamento) -> Abre modal de Comparecimento ou Proposta (conforme `lead.comparecimento`)
- **Clicar em "Vendido"** (estando em Proposta) -> Abre modal de Venda (se tem proposta aprovada) ou tooltip informando que precisa de proposta aprovada

## Detalhes tecnicos

### Arquivo: `src/pages/LeadPage.tsx`

1. **Tornar cada segmento clicavel** - Envolver cada `div` da barra em um `button` com `onClick` que verifica se e a proxima etapa e chama o handler correto

2. **Adicionar indicacao visual da proxima etapa** - A proxima etapa tera uma animacao de borda pulsante (ring animado) e icone de seta para indicar que e clicavel

3. **Logica de click handler** - Reutilizar os mesmos handlers ja existentes (`setIniciarAtendimentoOpen`, `setAgendamentoOpen`, `setComparecimentoOpen`, `setPropostaOpen`, `setVendaOpen`)

4. **Tooltips** - Usar o componente `Tooltip` ja disponivel para mostrar feedback ao passar o mouse sobre etapas nao clicaveis

Exemplo da logica de clique:

```typescript
const handleStageClick = (stageIndex: number) => {
  // Apenas proxima etapa e clicavel
  if (stageIndex !== currentStageIndex + 1) return;
  
  const nextStatus = FUNNEL_STAGES[stageIndex].status;
  switch (nextStatus) {
    case "info_sent": setIniciarAtendimentoOpen(true); break;
    case "scheduling": setAgendamentoOpen(true); break;
    case "docs_received":
      if (lead.comparecimento === true) setPropostaOpen(true);
      else setComparecimentoOpen(true);
      break;
    case "registered":
      if (hasApprovedProposta) setVendaOpen(true);
      else toast.info("Aprove uma proposta antes de confirmar a venda");
      break;
  }
};
```

### Mudancas visuais na barra

- Proxima etapa: `ring-1 ring-yellow-400/50 animate-pulse cursor-pointer`
- Hover na proxima etapa: escala sutil + tooltip com o nome da acao
- Label da proxima etapa: icone de `ChevronRight` antes do texto

Nao sera necessaria nenhuma alteracao de banco de dados. As acoes reutilizam os modais e hooks ja existentes, que ja atualizam o kanban via realtime.

