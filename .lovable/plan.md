

## Plano: Aba "Conexão Global" no Painel Admin de WhatsApp

### Contexto

O sistema possui dois tipos de instâncias WhatsApp:
1. **Instâncias individuais de corretores** - Gerenciadas pela edge function `whatsapp-instance-manager`
2. **Instância global da Enove** - Configurada via variáveis de ambiente (`UAZAPI_INSTANCE_URL`, `UAZAPI_TOKEN`), usada para notificações de leads

Atualmente não há interface para o administrador visualizar o status ou gerenciar a conexão da instância global.

---

### Solução

Adicionar uma nova aba "Conexão Global" entre "Visão Global" e "Conexão" com as mesmas funcionalidades da aba de conexão dos corretores, mas direcionada para a instância global.

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/whatsapp-global-instance-manager/index.ts` | Edge function dedicada para gerenciar a instância global |
| `src/hooks/use-whatsapp-global-instance.ts` | Hook para interagir com a nova edge function |
| `src/components/whatsapp/GlobalConnectionTab.tsx` | Componente da aba "Conexão Global" |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminWhatsApp.tsx` | Adicionar a nova aba "Conexão Global" |
| `src/components/whatsapp/index.ts` | Exportar o novo componente |

---

### Detalhes Técnicos

#### 1. Edge Function `whatsapp-global-instance-manager`

A função usará as variáveis de ambiente `UAZAPI_INSTANCE_URL` e `UAZAPI_TOKEN` para gerenciar a instância global. Endpoints:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/status` | GET | Verifica o status da instância global |
| `/qrcode` | GET | Obtém QR Code para reconectar |
| `/logout` | POST | Desconecta a instância |
| `/restart` | POST | Reinicia a instância |

A função extrairá o nome da instância da URL configurada:
```text
UAZAPI_INSTANCE_URL = https://api.uazapi.com/v2/enove_principal
                                              ^^^^^^^^^^^^^^^^
                                              instanceName extraído
```

#### 2. Hook `useWhatsAppGlobalInstance`

Similar ao `useWhatsAppInstance`, mas:
- Chama a edge function `whatsapp-global-instance-manager`
- Não precisa de broker_id (é uma instância global)
- Retorna dados da instância global em formato simplificado

Interface de retorno:
```typescript
interface GlobalInstanceState {
  status: "connected" | "disconnected" | "connecting" | "qr_pending";
  phoneNumber: string | null;
  instanceName: string | null;
  lastSeenAt: string | null;
}
```

#### 3. Componente `GlobalConnectionTab`

Layout similar ao `ConnectionTab`, mostrando:
- Card de status da conexão global
- QR Code quando desconectada
- Botões: "Novo QR Code", "Reiniciar", "Desconectar"
- Indicador visual diferenciado (cor/ícone) para identificar como instância "global"

#### 4. Alterações em `AdminWhatsApp.tsx`

Adicionar nova aba no `TabsList`:
```text
Visão Global | Conexão Global | Conexão | Campanhas | Fila | Segurança | Automação
             ^^^^^^^^^^^^^^^^
             Nova aba
```

A grade passará de 6 para 7 colunas.

---

### Interface da Aba

```text
+------------------------------------------+
|  🌐 Instância Global                      |
|  Status: ● Conectada                      |
|  Número: +55 51 99999-9999                |
|  Última atividade: há 2 minutos           |
|                                           |
|  [Reiniciar] [Desconectar]               |
+------------------------------------------+

ou (se desconectada):

+------------------------------------------+
|  🌐 Instância Global                      |
|  Status: ○ Desconectada                   |
|                                           |
|  +------------------------+               |
|  |      [QR CODE]        |               |
|  +------------------------+               |
|                                           |
|  [Gerar Novo QR Code]                     |
+------------------------------------------+
```

---

### Fluxo de Funcionamento

```text
1. Admin acessa aba "Conexão Global"
2. Hook chama GET /whatsapp-global-instance-manager/status
3. Edge function usa UAZAPI_INSTANCE_URL e UAZAPI_TOKEN
4. Retorna status da instância global
5. Se desconectada, admin pode gerar QR Code via GET /qrcode
6. Ao conectar, status atualiza automaticamente (polling)
```

---

### Benefícios

- **Visibilidade**: Admin pode ver se a instância global está funcionando
- **Controle**: Admin pode reconectar sem acesso direto à UAZAPI
- **Diagnóstico**: Facilita identificar problemas nas notificações
- **Separação**: Aba dedicada não interfere com instâncias de corretores

