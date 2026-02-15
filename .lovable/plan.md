

# Remover botões de ação fixos

O objetivo é remover os botões "Agendar Reunião", "Follow-Up" e "Perda" que aparecem de forma fixa/proeminente, tanto no header quanto no bloco mobile separado.

## Alterações

### Arquivo: `src/pages/LeadPage.tsx`

1. **Remover o bloco mobile duplicado** (linhas 379-394)
   - O bloco `sm:hidden` que repete os botões "Agendar Reunião", "Follow-Up" e "Perda" em tela mobile será removido por completo.

2. **Remover a action bar fixa do header** (linhas 337-366)
   - Eliminar a barra de ações que contém os botões "Agendar Reunião", "Follow-Up", "Perda", "Reagendar" e "Transferir" dentro do header estratégico.
   - Os botões de ação continuarão acessíveis dentro do conteúdo da página (seções de progresso comercial, etc.), mas não ficarão fixos no topo.

3. **Reduzir o padding inferior** (linha 371)
   - Trocar `pb-24` por `pb-10`, já que não haverá mais barra fixa no rodapé ocupando espaço.

### Resultado

O header estratégico ficará mais limpo, apenas com nome, badge, SLA e barra de funil. As ações estarão disponíveis nas seções apropriadas dentro do conteúdo da página.
