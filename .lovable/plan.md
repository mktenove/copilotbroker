

# Mover botoes de acao para o header e renomear "Registrar Agendamento"

## Alteracoes

### Arquivo: `src/pages/LeadPage.tsx`

1. **Renomear "Registrar Agendamento" para "Agendar Reuniao"**
   - No `primaryAction` (linha 241), trocar o label de `"Registrar Agendamento"` para `"Agendar Reunião"`

2. **Mover todos os botoes de acao da coluna direita para a primeira secao (header estrategico)**
   - Os botoes que atualmente ficam na secao "Acoes" da coluna direita (linhas 494-528) serao movidos para a area do header (abaixo do progress bar ou integrados na linha de botoes do header)
   - Botoes a mover: Acao primaria (dinamica), Reagendar, Agendar Follow-Up, Registrar Perda, Transferir Lead
   - Layout: uma barra de acoes horizontal dentro do header, abaixo da barra de funil, com o botao primario em destaque e os secundarios ao lado

3. **Remover a secao "Acoes" da coluna direita**
   - Eliminar o bloco `<section>` de "Acoes" (linhas 494-528) da coluna direita
   - A coluna direita ficara apenas com os estados (Venda/Perda) e a Timeline

4. **Atualizar o botao mobile** (linha 360-366) para tambem mostrar "Agendar Reuniao" e incluir os botoes secundarios

### Resultado visual

```text
HEADER ESTRATEGICO
  [Nome] [Badge] [SLA]
  [===== BARRA FUNIL =====]
  [Agendar Reuniao (primario)] [Follow-Up] [Reagendar] [Perda] [Transferir]

COLUNA ESQUERDA          |  COLUNA DIREITA
  Dados do Lead          |    Estado (Venda/Perda)
  Progresso Comercial    |    Linha do Tempo
  Metricas               |
```

