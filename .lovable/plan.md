
## Padrao "Mensagem Personalizada" ao criar campanhas

### O que muda

Alterar o valor default de `useTemplate` de `true` para `false` em tres locais no arquivo `src/components/whatsapp/NewCampaignSheet.tsx`:

1. **Estado inicial dos steps** (linha 79): `useTemplate: true` -> `useTemplate: false`
2. **Reset ao abrir o sheet** (linha 116): `useTemplate: true` -> `useTemplate: false`
3. **Ao adicionar nova etapa** (linha 202): `useTemplate: true` -> `useTemplate: false`

### O que NAO muda
- Nenhuma alteracao em tipos, hooks ou banco de dados
- O corretor ainda pode trocar para template clicando no botao
- Comportamento de envio permanece igual
