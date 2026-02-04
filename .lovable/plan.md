
## Objetivo
Fazer o status “Conectado” aparecer corretamente na tela `/corretor/whatsapp` após você escanear o QR Code (no celular já aparece “Ativo”), eliminando o “status travado” no painel.

---

## Diagnóstico do que está acontecendo (com base no código atual)
Hoje a rota **GET `/whatsapp-instance-manager/status`** faz somente isto para checar o estado no provedor:

- chama **apenas** `GET /instance/connectionState/{instanceName}` (um único endpoint)
- usa como token **prioritário** `instance.instance_token` (se existir)
- **não** passa o token admin como fallback nessa rota
- interpreta “conectado” apenas por campos típicos de algumas variantes (`connected`, `loggedIn`, `instance.status`, `response`)

Isso gera 2 causas bem prováveis para “não exibir conectado”:

### Causa A) Endpoint de status errado / incompleto
Seu `/qrcode` tenta vários endpoints (connect_get, connect_post, connectionState, etc.) e consegue achar um que funciona.
Já o `/status` tenta só `connectionState`. Se a sua instalação da UAZAPI retorna status em outro endpoint, o `/status` nunca vai conseguir confirmar “connected”.

### Causa B) Token prioritário errado para status
Você confirmou: **Token usado = Token admin** e **Auth header = token**.
Se a `instance_token` guardada no banco estiver ausente/antiga/inválida, a chamada do `/status` pode falhar (401/404), e aí o código não atualiza o status local — e o frontend continua mostrando `qr_pending`/`disconnected`.

---

## Estratégia de correção
Vamos tornar o `/status` tão “resiliente” quanto o `/qrcode`, e alinhar com sua regra: **sempre tentar token admin**.

---

## Passo 1 — Confirmar o que o frontend está recebendo (rápido e decisivo)
1. No navegador, abrir DevTools → Network.
2. Clicar em “Atualizar” na aba Conexão.
3. Inspecionar a resposta do request `.../functions/v1/whatsapp-instance-manager/status` e verificar:
   - se `uazapi` vem `null`
   - se vem com `instance.state` tipo `"open"`, `"close"`, etc.
   - se vem com `instance.status` ou `connected: true`
4. Isso vai orientar o mapeamento de status (mas já vamos suportar todos os formatos conhecidos).

(Como implementação, também podemos retornar um campo `debug` simples na resposta do `/status` com `attemptUsed`, `httpStatus`, `rawState` para facilitar.)

---

## Passo 2 — Ajustar a Edge Function `/status` (principal correção)
### 2.1. Token: preferir admin token e manter fallback
Na chamada do provedor dentro do `/status`, mudar para:

- **token principal:** `UAZAPI_DEFAULT_TOKEN` (admin)
- **fallback tokens:** `[instance.instance_token]` (se existir e for diferente)

Isso garante que mesmo com `instance_token` inválido, o status ainda é consultado via admin token, como você confirmou ser o correto.

### 2.2. Endpoint probing no `/status` (igual ao `/qrcode`)
Trocar o hardcode de:
- `GET /instance/connectionState/{name}`

para uma lista de tentativas, por exemplo:
- `GET /instance/connectionState/{name}`
- `GET /instance/connection-state/{name}`
- `GET /instance/connect/{name}` (algumas variantes retornam status aqui)
- `GET /instance/fetchInstances` (admin) e filtrar o item do instanceName para inferir estado

A primeira resposta `200 OK` define o `uazStatus` usado.

### 2.3. Mapeamento de status: aceitar `state=open` e equivalentes
Hoje o `/status` não considera `instance.state === "open"` como conectado (isso é comum e inclusive já está no webhook).
Vamos criar um normalizador:

- Extrair um `raw` (string) de:
  - `uazStatus.instance?.state`
  - `uazStatus.instance?.status`
  - `uazStatus.state`
  - `uazStatus.status`
  - `uazStatus.response`
- Normalizar para lowercase e mapear:
  - `"open"`, `"connected"`, `"online"` → `connected`
  - `"connecting"` → `connecting`
  - `"qr"`, `"qr_pending"`, `"qrcode"`, `"pairing"` → `qr_pending` (opcional, se aparecer)
  - `"close"`, `"closed"`, `"disconnected"`, `"offline"` → `disconnected`
- Também manter o boolean:
  - `uazStatus.connected === true` ou `uazStatus.loggedIn === true` → `connected`

### 2.4. Atualizar o objeto retornado (não só o banco)
Atualmente o código faz `instance.status = newStatus`, mas não reflete `connected_at`, `phone_number`, `last_seen_at` no objeto retornado.
Vamos:
- atualizar o banco
- e também “espelhar” os campos no `instance` que será retornado no JSON para o frontend, garantindo que a UI reflita imediatamente a mudança.

---

## Passo 3 — Ajuste no polling do frontend (para não “parar de atualizar”)
Hoje o hook só faz polling quando:
- `qr_pending` ou `connecting` (5s)
- `connected` (60s)

Se por algum motivo o backend marcar como `disconnected` durante o processo (ou começar em disconnected), o hook para de atualizar sozinho.
Vamos ajustar para:
- se existir `instance` e `status === "disconnected"`, fazer polling (ex: a cada 10–15s) por um período (ex: 2–3 minutos) ou até mudar o status.

Isso reduz a necessidade de ficar clicando em “Atualizar”.

---

## Passo 4 — Melhorar feedback de erro na UI (evitar “falha silenciosa”)
O hook já seta `error`, mas o `ConnectionTab` não exibe.
Vamos adicionar um pequeno alerta/card quando `error` existir, com uma mensagem tipo:
- “Não foi possível verificar o status agora. Clique em Atualizar.”

E (opcional) um botão “Copiar detalhes técnicos” usando o `uazapi` retornado pelo backend para diagnóstico.

---

## Critérios de aceite (o que deve acontecer após a correção)
1. Escanear QR Code → em até 5s o status muda para **Conectado** na UI.
2. Se o provedor retornar `state: "open"`, o sistema reconhece como conectado.
3. Mesmo que `instance_token` esteja inválido, o status atualiza (porque usa token admin).
4. Em “disconnected”, o painel continua tentando atualizar automaticamente (sem precisar clicar toda hora).

---

## Arquivos que serão alterados
1. `supabase/functions/whatsapp-instance-manager/index.ts`
   - Melhorar `/status`: token admin preferencial, probing de endpoints, mapeamento robusto, resposta com debug, espelhar campos no objeto retornado.
2. `src/hooks/use-whatsapp-instance.ts`
   - Incluir polling também no estado `disconnected` (com intervalo mais lento).
3. `src/components/whatsapp/ConnectionTab.tsx` (pequeno)
   - Exibir `error` do hook (alerta simples).

---

## Risco/atenções
- Precisamos manter o `status` sempre dentro do union: `disconnected | connecting | connected | qr_pending` para não quebrar o `ConnectionStatusCard`.
- O probing deve parar no primeiro `200 OK` para não aumentar muito a latência.

---

## Teste end-to-end (checklist)
1. Abrir `/corretor/whatsapp`.
2. Iniciar conexão → gerar QR.
3. Escanear no celular.
4. Aguardar até 10s:
   - UI deve mudar para “Conectado”
   - QR deve sumir
   - “Conectado há” começa a aparecer
5. Clicar “Desconectar” e repetir o fluxo para garantir que reconexão também atualiza status.
