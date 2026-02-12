

## Filtrar fila por corretores online + Lider define proximo da fila

### Mudancas

**1. `src/components/broker/BrokerRoletas.tsx` -- Mostrar apenas corretores online**

- Na secao "Queue list", filtrar `allMembros` para exibir apenas os membros com `status_checkin === true`
- Atualizar o texto do toggle para refletir apenas a contagem de online (ex: "Fila Online (3 corretores)")
- Manter a logica de "Proximo" e "Voce" como esta

**2. `src/components/admin/RoletaManagement.tsx` -- Lider pode definir o proximo**

- Adicionar um botao "Definir como proximo" (icone de seta ou target) ao lado de cada membro online na lista de membros
- Ao clicar, atualizar o campo `ultimo_membro_ordem_atribuida` da roleta para `ordem - 1` do membro selecionado, fazendo com que ele seja o proximo na logica round-robin
- Usar a funcao `updateRoleta(id, { ultimo_membro_ordem_atribuida: ordem - 1 })` que ja existe no hook

**3. `src/hooks/use-roletas.ts`** -- Nenhuma mudanca necessaria (ja possui `updateRoleta`)

### Detalhes tecnicos

- Nenhuma migracao de banco necessaria
- A logica de "proximo" ja funciona com base em `ultimo_membro_ordem_atribuida`: o proximo e o primeiro membro online com `ordem > ultimo_membro_ordem_atribuida`. Para "definir como proximo", basta setar `ultimo_membro_ordem_atribuida = ordem_do_membro - 1`
- O botao "Definir como proximo" so aparece para membros com check-in ativo (online)

