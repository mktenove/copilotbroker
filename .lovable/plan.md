
# Correção: Normalização do 9o dígito em telefones brasileiros

## Problema encontrado

A resposta "Oiiii" do lead foi **recebida** pelo webhook, mas **não foi associada** a nenhuma mensagem na fila porque os telefones estão em formatos diferentes:

| Onde | Telefone | Dígitos |
|------|----------|---------|
| WhatsApp chatid | `+555197010323` | 12 (sem 9o dígito) |
| Fila de mensagens | `+5551997010323` | 13 (com 9o dígito) |

O WhatsApp frequentemente omite o 9o dígito nos números de celular brasileiros no campo `chatid`. A busca na fila (`eq("phone", "+555197010323")`) retorna vazio porque o registro usa `+5551997010323`.

## Solucao

Atualizar a funcao `formatPhoneE164` no `whatsapp-webhook/index.ts` para normalizar numeros brasileiros, sempre adicionando o 9o digito quando ausente:

```text
// Logica de normalizacao:
// 1. Limpa caracteres nao-numericos
// 2. Se comeca com 55 e tem 12 digitos (55 + DDD 2 digitos + 8 digitos)
//    -> insere o "9" apos o DDD: 55 + XX + 9 + XXXXXXXX
// 3. Se nao comeca com 55, trata como numero local (10 digitos -> adiciona 9)
```

Isso garante que `+555197010323` sera normalizado para `+5551997010323`, casando com o formato armazenado na fila.

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Editar | `supabase/functions/whatsapp-webhook/index.ts` (funcao `formatPhoneE164`) |
| Deploy | whatsapp-webhook |

## Resultado esperado

Apos o deploy, qualquer resposta recebida sera normalizada para o mesmo formato do telefone na fila, permitindo:
- Match correto na busca de mensagens enviadas
- Cancelamento dos follow-ups com `send_if_replied=false`
- Registro na tabela `whatsapp_lead_replies`
