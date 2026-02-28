

## Plan: Refatorar `/accept-invite` para fluxo OTP

A página atual usa um formulário de criação de senha. O novo fluxo exige verificar sessão ativa e, se não autenticada, disparar `signInWithOtp` para o email do convite.

### Mudanças

**1. Reescrever `src/pages/AcceptInvite.tsx`**

Nova máquina de estados com 5 telas:

- **`validating`** — Spinner "Validando convite..." + chama `validate-invite` para obter email
- **`needs_auth`** — Email pré-preenchido (readonly) + botão "Enviar link de acesso" → chama `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://copilotbroker.lovable.app/aceitar-convite?token=TOKEN' } })`; ao sucesso, troca para estado `otp_sent`
- **`otp_sent`** — Mensagem "Enviamos um link para seu e-mail. Verifique sua caixa de entrada." com ícone de email
- **`accepting`** — Spinner "Ativando seu acesso..." + chama `accept-invite` com `{ token }`; ao sucesso, redireciona para `/corretor/admin`
- **`error`** — Mensagens diferenciadas:
  - Convite expirado → "Este convite expirou. Solicite um novo convite ao administrador."
  - Convite cancelado → "Este convite foi cancelado."
  - Token inválido → "Convite não encontrado."
  - Email não confere → "O email logado não corresponde ao convite."

Lógica principal no `useEffect` após validação:
```
1. validate-invite → obter email
2. Checar supabase.auth.getSession()
   - Se tem sessão → ir direto para "accepting" (chamar accept-invite)
   - Se não → mostrar tela "needs_auth"
```

Também escutar `onAuthStateChange` para quando o usuário voltar do magic link (já autenticado), automaticamente chamar `accept-invite`.

**2. Atualizar `validate-invite` edge function**

Permitir status `opened` além de `sent` (o usuário pode recarregar a página). Linha 32 do validate-invite atual rejeita tudo que não é `sent` — mudar para aceitar `sent` ou `opened`.

**3. Visual**

Manter o estilo do tema escuro/aviation do projeto (bg-black, font-mono, cores `#FFFF00`) para consistência com a página de Auth, em vez do estilo genérico Card atual.

### Arquivos a editar
- `src/pages/AcceptInvite.tsx` — reescrever completo
- `supabase/functions/validate-invite/index.ts` — aceitar status `opened`

