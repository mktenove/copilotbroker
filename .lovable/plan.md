
## Trocar Switch por RadioGroup no controle de resposta

### O que muda

Substituir o componente `Switch` pelo `RadioGroup` com duas opcoes explicitas, tornando a escolha mais clara para o corretor:

- **(o) Enviar mesmo que o lead responda**
- **(  ) Enviar somente se o lead nao responder** (selecionado por padrao)

### Alteracao

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

1. Remover import do `Switch`, adicionar import de `RadioGroup, RadioGroupItem` de `@/components/ui/radio-group`

2. Substituir o bloco do Switch (linhas 583-592) por um `RadioGroup` com duas opcoes:

```text
Enviar apos: [5 minutos v]

( ) Enviar mesmo que o lead responda
(o) Enviar somente se o lead nao responder
```

3. O valor do RadioGroup sera `"true"` ou `"false"` (string), mapeado para o campo `sendIfReplied` (boolean) via `onValueChange`

4. Valor padrao: `"false"` (nao enviar se responder)

### O que NAO muda
- O campo `sendIfReplied` no state e no submit continua sendo boolean
- Nenhuma alteracao no hook, tipos ou banco de dados
- A etapa 1 continua sem mostrar essa opcao
