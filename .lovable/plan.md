

# Remover keyword "para" e limpar falsos positivos

## O que sera feito

1. Remover a keyword "para" da lista `OPTOUT_KEYWORDS` no webhook `whatsapp-webhook`
2. Deletar os 131 registros de opt-out que foram detectados com a keyword "para" do banco de dados

## Alteracoes

### 1. Webhook (`supabase/functions/whatsapp-webhook/index.ts`)

Linha 17 - remover `"para"` do array:

De:
```
"stop", "remove", "unsubscribe", "para", "chega"
```

Para:
```
"stop", "remove", "unsubscribe", "chega"
```

### 2. Banco de dados

Executar DELETE para remover os 131 opt-outs falsos positivos:

```sql
DELETE FROM whatsapp_optouts WHERE detected_keyword = 'para';
```

## Impacto

- Nenhum contato que escreveu "para" (como preposicao) sera mais bloqueado
- 131 contatos que estavam bloqueados indevidamente voltarao a poder receber mensagens
- Keywords legitimas (pare, sair, cancelar, stop, etc.) continuam funcionando normalmente

