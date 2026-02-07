

# Corrigir Visibilidade do QR Code na Conexao do Corretor

## Problema

Quando o corretor clica em "Iniciar Conexao", o QR Code aparece por alguns segundos e depois desaparece. Isso acontece porque:

1. A instancia e criada com status `qr_pending` e o QR Code e exibido corretamente
2. O polling de status (a cada 5 segundos) consulta a UAZAPI, que retorna `"connecting"`
3. O normalizador mapeia `"connecting"` para o status interno `"connecting"`
4. A interface so mostra o QR Code quando o status e `"qr_pending"` ou `"disconnected"`, entao o QR desaparece e mostra o card de "Saude" no lugar

## Correcao

### 1. Incluir "connecting" na logica de exibicao do QR Code (`ConnectionTab.tsx`)

Na linha que decide se mostra o QR Code ou o card de saude, adicionar `"connecting"` ao conjunto de status que exibem o QR:

```text
ANTES:  needsQR = status === "qr_pending" || status === "disconnected"
DEPOIS: needsQR = status === "qr_pending" || status === "connecting" || status === "disconnected"
```

Isso faz sentido porque na UAZAPI, `"connecting"` significa exatamente "QR Code esta disponivel, aguardando escaneamento".

### 2. Atualizar texto de status no `ConnectionStatusCard.tsx`

O status `"connecting"` exibe "Estabelecendo conexao..." mas na realidade o usuario precisa escanear o QR Code. Ajustar a mensagem para algo como "Escaneie o QR Code para conectar".

### 3. Atualizar polling adaptativo no hook `use-whatsapp-instance.ts`

O polling para `"connecting"` ja esta com 5 segundos (igual ao `qr_pending`), o que e correto. Nenhuma mudanca necessaria aqui.

## Arquivos a Alterar

- `src/components/whatsapp/ConnectionTab.tsx` - Adicionar `"connecting"` ao check `needsQR`
- `src/components/whatsapp/ConnectionStatusCard.tsx` - Ajustar mensagem do status `"connecting"` para orientar o usuario a escanear o QR Code

## Resultado Esperado

- O QR Code permanece visivel enquanto o status for `connecting` (aguardando escaneamento)
- Quando o usuario escanear o QR, o status muda para `connected` e o QR desaparece automaticamente
- A mensagem de status orienta o usuario corretamente

