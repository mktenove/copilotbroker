
# Botao WhatsApp mais evidente com campo de mensagem e registro de interacao

## Resumo

Transformar o botao WhatsApp na secao "Dados do Lead" em um botao mais visivel que, ao ser clicado, abre um campo de texto para o corretor escrever a mensagem antes de enviar. A mensagem e a interacao serao registradas na tabela `lead_interactions` para medir performance dos corretores.

## Alteracoes

### Arquivo: `src/pages/LeadPage.tsx`

1. **Adicionar estado para controle do campo de mensagem WhatsApp**
   - `whatsappMsgOpen` (boolean) para mostrar/esconder o campo
   - `whatsappMsg` (string) para armazenar o texto da mensagem
   - `sendingWhatsapp` (boolean) para estado de carregamento

2. **Substituir o link pequeno de WhatsApp por um botao mais evidente**
   - Trocar o `<a>` discreto (text-[10px]) por um `<Button>` com estilo verde/emerald, maior e mais chamativo
   - Ao clicar, em vez de abrir o wa.me diretamente, exibir um campo de textarea inline abaixo do telefone

3. **Campo de mensagem WhatsApp (inline, abaixo do telefone)**
   - Textarea para escrever a mensagem
   - Botao "Enviar via WhatsApp" que:
     a) Registra a interacao na tabela `lead_interactions` com `interaction_type = 'whatsapp_manual'` e a mensagem no campo `notes`
     b) Abre o link wa.me com a mensagem pre-preenchida via `encodeURIComponent`
     c) Fecha o campo e limpa o texto
   - Botao cancelar para fechar sem enviar

4. **Manter o botao WhatsApp do header** (linha 311) como esta, pois ele abre direto sem mensagem -- ou tambem transformar para consistencia (a escolha e manter simples no header)

### Tabela `lead_interactions`

Nenhuma alteracao de schema necessaria. O campo `interaction_type` ja aceita valores customizados (e do tipo USER-DEFINED/enum). Precisaremos verificar se `'whatsapp_manual'` ja existe no enum ou se precisamos adicionar.

### Migracao SQL (se necessario)

Adicionar o valor `'whatsapp_manual'` ao enum `interaction_type` caso nao exista, para registrar corretamente esse tipo de interacao.

### Fluxo do usuario

```text
1. Corretor ve o botao "Enviar WhatsApp" destacado na secao de dados
2. Clica no botao -> aparece textarea + botao "Enviar"
3. Escreve a mensagem
4. Clica "Enviar via WhatsApp"
5. Sistema registra a interacao (lead_interactions)
6. Abre wa.me com a mensagem pre-preenchida
7. Campo fecha automaticamente
```

### Detalhes tecnicos

- O link wa.me sera construido como: `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
- A interacao sera inserida via `addInteraction('whatsapp_manual', { notes: message, channel: 'whatsapp' })`
- O hook `useLeadInteractions` ja possui a funcao `addInteraction` pronta para uso
- Verificar o enum `interaction_type` no banco e adicionar `whatsapp_manual` se necessario
