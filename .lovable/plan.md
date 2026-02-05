

# Correção do QR Code e Redesign da Aba Conexão Global

## Problema Identificado

Analisando os logs da edge function, identifiquei a causa raiz:

```
📨 Init response (200): {"instance":{"token":"b22d514d-7808-435d-926a-9982a70e05b8","qrcode":"","name":"enove_global_1770334538997"...}
📨 Status after init (401): {"code":401,"message":"Missing token."}
```

A instancia e criada com sucesso e retorna um **novo token** (`b22d514d-7808-435d-926a-9982a70e05b8`), porem:

1. O campo `qrcode` esta vazio no momento da criacao (comportamento normal da UAZAPI)
2. O sistema tenta obter o QR Code usando os **tokens antigos** (das variaveis de ambiente), que nao sao validos para a nova instancia
3. Para obter o QR Code, e necessario chamar `/instance/connectionState/{nome_da_instancia}` usando o **token retornado pela criacao**

## Solucao

### 1. Edge Function - Fluxo Corrigido

Atualizar `whatsapp-global-instance-manager/index.ts`:

a) **Endpoint `/init`**: Apos criar a instancia, chamar `/instance/connectionState/{name}` com o novo token para obter o QR Code

b) **Endpoint `/qrcode`**: Usar o token retornado pela criacao (armazenado em memoria ou banco) para obter o QR

c) **Adicionar endpoint auxiliar**: Armazenar temporariamente o token da ultima instancia criada para uso nas proximas chamadas

### 2. Redesign do Layout (Igual a Aba Conexao)

A aba de corretores (`ConnectionTab.tsx`) tem um design mais limpo com:
- Grid de 2 colunas: Status a esquerda, QR Code a direita
- Card de status sem excesso de botoes
- QR Code em destaque quando necessario

Aplicar o mesmo design na aba global:
- Remover o card informativo do topo (muito texto)
- Simplificar os botoes de acao
- Mostrar o QR Code de forma mais proeminente
- Interface mais direta e focada

---

## Alteracoes Tecnicas

### Arquivo 1: `supabase/functions/whatsapp-global-instance-manager/index.ts`

```text
Mudancas:
1. Armazenar o token e nome da ultima instancia criada em variaveis globais
2. No /init: Apos criar, chamar /instance/connectionState/{name} com o novo token
3. No /qrcode: Usar o token armazenado (da ultima instancia criada) em vez dos tokens antigos
4. Adicionar delay antes de buscar QR (UAZAPI leva ~2s para gerar)
5. Tentar multiplos endpoints: /instance/connectionState/{name}, /instance/connect
```

Fluxo corrigido do /init:
```
1. Criar instancia via POST /instance/init (admintoken)
2. Extrair token retornado
3. Aguardar 2 segundos
4. Chamar GET /instance/connectionState/{name} com novo token
5. Retornar QR Code
```

### Arquivo 2: `src/hooks/use-whatsapp-global-instance.ts`

```text
Mudancas:
1. Guardar o token retornado pela criacao
2. Passar o token nas chamadas subsequentes de /qrcode
3. Melhorar tratamento de erros
```

### Arquivo 3: `src/components/whatsapp/GlobalConnectionTab.tsx`

```text
Mudancas (redesign igual ConnectionTab):
1. Remover card azul informativo do topo
2. Simplificar para grid 2 colunas: Status | QR Code
3. Mover botoes para dentro do card de status
4. Card de QR mais limpo e em destaque
5. Remover card "Sobre a Instância Global" (informacao excessiva)
```

Layout final:
```
+--------------------------------+--------------------------------+
|  Status da Conexão Global      |  QR Code                       |
|  ─────────────────────────     |  ─────────────────────────     |
|  [Status Badge]                |  [Imagem QR Code]              |
|  Instancia: enove_global_xxx   |                                |
|  Ultima verificacao: 2min      |  Escaneie com WhatsApp         |
|                                |                                |
|  [Atualizar] [Gerar QR]        |  [Atualizar QR Code]           |
|  [Limpar Sessao]               |                                |
+--------------------------------+--------------------------------+
```

---

## Resultado Esperado

Apos as alteracoes:

1. Ao clicar em "Criar Nova Instancia", o sistema criara a instancia E retornara o QR Code automaticamente
2. Interface mais limpa e consistente com a aba de corretores
3. Fluxo simplificado: menos cliques para conectar
4. Tokens gerenciados corretamente entre criacao e obtencao de QR

