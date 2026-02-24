

# Correcao: Notificacoes ausentes para leads distribuidos por Roleta

## Diagnostico

### Causa Raiz
Existe um **CHECK constraint** na tabela `notifications` que so permite 3 tipos: `new_lead`, `stale_lead`, `status_change`. A funcao `roleta-distribuir` tenta inserir notificacoes com tipo `"roleta_lead"`, que **viola o constraint e falha silenciosamente** -- o corretor nunca recebe a notificacao.

### Fluxo do problema
```text
Lead cadastrado (sem corretor) 
  -> trigger notify_new_lead: broker_id = NULL, notifica so admins
  -> trigger trigger_lead_roleta_distribuir: chama edge function
  -> roleta-distribuir: atribui corretor via UPDATE
  -> tenta INSERT notification com type="roleta_lead" 
  -> CHECK constraint bloqueia -> FALHA SILENCIOSA
  -> corretor NUNCA recebe notificacao
```

### Impacto medido no banco de dados
| Empreendimento | Leads via Roleta | Notificacoes Recebidas | Faltando |
|---|---|---|---|
| O Novo Condominio | 135 | 136 | 0 (OK - leads entram com broker_id) |
| GoldenView | 125 | 19 | **106** |
| Mauricio Cardoso | 42 | 4 | **38** |
| Imoveis Prontos | 1 | 1 | 0 |

A Fabiane **tem** 2 notificacoes no banco (ela recebeu leads pela pagina de corretor, que insere com broker_id). O problema sao os leads via roleta que nunca geraram notificacao.

## Solucao

### 1. Migracao de banco de dados
- Alterar o CHECK constraint para incluir `"roleta_lead"` como tipo valido
- Isso permite que a funcao `roleta-distribuir` insira notificacoes corretamente

### 2. Atualizar o frontend
Atualizar o mapa de icones/cores de notificacoes nos 3 componentes que renderizam notificacoes:

- `src/hooks/use-notifications.ts` - adicionar `"roleta_lead"` ao tipo
- `src/components/admin/NotificationPanel.tsx` - adicionar icone/cor para `roleta_lead`
- `src/components/broker/BrokerLayout.tsx` - adicionar icone/cor para `roleta_lead`
- `src/components/admin/MobileBottomNav.tsx` - nao precisa (nao renderiza notificacoes inline)

### 3. Gerar notificacoes retroativas
Executar SQL para criar as notificacoes que faltam para os leads ja distribuidos por roleta que nunca tiveram notificacao gerada. Isso garante que os corretores vejam o historico completo.

## Arquivos a modificar

- **Migracao SQL**: Alterar CHECK constraint em `notifications`
- `src/hooks/use-notifications.ts`: Adicionar `"roleta_lead"` ao type union
- `src/components/admin/NotificationPanel.tsx`: Adicionar icone (Shuffle) e cor para `roleta_lead`
- `src/components/broker/BrokerLayout.tsx`: Adicionar icone e cor para `roleta_lead`

