
## Remover funcionalidade de Templates de WhatsApp

### Resumo
Eliminar completamente o sistema de templates de mensagens WhatsApp. O usuario passa a digitar a mensagem diretamente ao criar cada etapa da campanha, sem opcao de selecionar templates pre-definidos.

### Alteracoes

**1. NewCampaignSheet.tsx -- Remover toggle Template/Personalizada e logica de template**
- Remover os botoes "Template" / "Personalizada" (linhas 604-623)
- Remover o bloco condicional do Select de templates (linhas 625-640)
- Manter apenas o Textarea de mensagem personalizada (sempre visivel)
- Remover `useTemplate` e `templateId` do estado dos steps e de todas as funcoes (`addStep`, `resetForm`, `updateStep`)
- Simplificar `getStepMessage` para retornar apenas `step.messageContent`
- Simplificar `stepsValid` para checar apenas `messageContent`
- Simplificar `handleSubmit` para nao referenciar templates
- Remover `templates` do destructuring de `useWhatsAppCampaigns`
- Remover import de `replaceTemplateVariables` (manter se usado no preview -- verificar: sim, e usado no `getPreview`, mas pode usar diretamente sem templates)

**2. CampaignsTab.tsx -- Remover botao e sheet de Templates**
- Remover import e uso de `TemplatesSheet`
- Remover estado `isTemplatesOpen`
- Remover botao "Templates" do header
- Remover `<TemplatesSheet>` do JSX

**3. use-whatsapp-campaigns.ts -- Remover operacoes de templates**
- Remover query de templates (`whatsapp-templates`)
- Remover mutations: `createTemplateMutation`, `updateTemplateMutation`, `deleteTemplateMutation`
- Remover `templates`, `createTemplate`, `updateTemplate`, `deleteTemplate` do retorno
- Remover import de `WhatsAppMessageTemplate`
- Remover interface `CreateTemplateData`
- Manter a referencia a `template_id` no insert da campanha como `null` (campo existe no banco)

**4. whatsapp/index.ts -- Remover export do TemplatesSheet**
- Remover linha `export { TemplatesSheet } from "./TemplatesSheet"`

**5. TemplatesSheet.tsx -- Nao excluir o arquivo**
- O arquivo pode ser mantido no projeto sem ser referenciado (dead code), ou pode ser excluido. Vou remove-lo pois nao sera mais usado.

**6. CampaignStepInput (types/whatsapp.ts) -- Limpar campos de template**
- Remover `templateId` e `useTemplate` da interface `CampaignStepInput`
- Manter `TemplateCategory`, `WhatsAppMessageTemplate` e demais tipos no arquivo (podem ser usados em outros contextos ou pelo banco)

### O que NAO muda
- Tabelas no banco de dados (`whatsapp_message_templates`, `campaign_steps.template_id`) permanecem intactas
- Variaveis de template (`{nome}`, `{empreendimento}`, `{corretor_nome}`) continuam funcionando na mensagem personalizada
- Fluxo de criacao de campanha, selecao de leads, sequencias e envio permanecem iguais
- Edge functions nao sao afetadas
