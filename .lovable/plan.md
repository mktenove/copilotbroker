

## Corrigir acessibilidade do botao "Iniciar Campanha" em telas menores

### Problema
O Sheet de criacao de campanha tem muito conteudo vertical (nome, status, empreendimento, contagem de leads, mensagem, preview, botoes). Em telas com resolucao menor, o conteudo ultrapassa a altura visivel e, embora o Sheet tenha `overflow-y-auto`, os botoes de acao ficam escondidos no final do scroll, dificultando ou impossibilitando o clique.

### Solucao
Fixar os botoes de acao ("Cancelar" e "Iniciar Campanha") na parte inferior do Sheet, criando um rodape sticky que fica sempre visivel independente do scroll do conteudo.

### Detalhes tecnicos

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

1. Reestruturar o layout interno do SheetContent para separar o conteudo rolavel dos botoes fixos:
   - Mover o `overflow-y-auto` do SheetContent para uma div interna que envolve apenas o conteudo do formulario
   - O SheetContent passa a usar `flex flex-col` para organizar header, conteudo rolavel e footer fixo
   - Os botoes de acao ficam em uma div separada com `sticky bottom-0` e um fundo solido para nao sobrepor conteudo de forma transparente

2. Estrutura resultante:
```text
SheetContent (flex flex-col, sem overflow)
  |-- SheetHeader (fixo no topo)
  |-- div.flex-1.overflow-y-auto (conteudo rolavel)
  |     |-- Nome da campanha
  |     |-- Selecao de status
  |     |-- Filtro de empreendimento
  |     |-- Contagem de leads
  |     |-- Mensagem / Template
  |     |-- Preview
  |-- div.sticky.bottom-0 (botoes sempre visiveis)
        |-- Cancelar | Iniciar Campanha
```

3. O footer tera um gradiente sutil no topo (`bg-gradient-to-t from-[#0f0f11]`) para indicar visualmente que ha conteudo rolavel acima, e padding inferior seguro (`pb-safe` ou `pb-6`) para dispositivos com barra de navegacao.

Nenhuma outra mudanca necessaria. Apenas reorganizacao do layout CSS dentro do mesmo componente.
