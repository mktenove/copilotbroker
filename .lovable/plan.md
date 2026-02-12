
## Adicionar selecao de empreendimentos no formulario de criacao de Roleta

### Objetivo

Ao criar uma nova roleta, o usuario ja podera selecionar os empreendimentos vinculados no mesmo formulario, eliminando a necessidade de expandir a roleta depois e vincular um a um.

### Mudancas

**Arquivo: `src/components/admin/RoletaManagement.tsx`**

1. Adicionar estado `formSelectedProjects: string[]` para armazenar os IDs dos empreendimentos selecionados durante a criacao
2. No dialog "Nova Roleta", adicionar uma secao de checkboxes com a lista de empreendimentos ativos (usando o componente `Checkbox` ja disponivel)
   - Cada checkbox mostra o nome do empreendimento e a cidade
   - Permitir selecionar multiplos empreendimentos
3. Atualizar a funcao `handleCreate`:
   - Apos criar a roleta com sucesso, buscar o ID da roleta recem-criada
   - Para cada empreendimento selecionado, chamar `addEmpreendimento(roletaId, projectId)`
   - Limpar `formSelectedProjects` ao finalizar
4. Resetar o estado `formSelectedProjects` quando o dialog fechar

**Arquivo: `src/hooks/use-roletas.ts`**

- Alterar `createRoleta` para retornar o ID da roleta criada (em vez de apenas `true/false`), usando `.select("id").single()` no insert. Isso permite vincular os empreendimentos logo em seguida.

### Layout do formulario atualizado

```text
+----------------------------------+
| Nova Roleta                      |
+----------------------------------+
| Nome da Roleta                   |
| [________________________]       |
|                                  |
| Lider Responsavel                |
| [Select lider...        v]      |
|                                  |
| Tempo de Reserva: 10 min        |
| [-------o-----------]           |
|                                  |
| Empreendimentos                  |
| [x] GoldenView (Portao)        |
| [ ] Estancia Velha (Est. Velha) |
| [x] Mauricio Cardoso (MC)      |
|                                  |
| [Cancelar]  [Criar Roleta]      |
+----------------------------------+
```

### Detalhes tecnicos

- O `createRoleta` no hook passara a fazer `.insert(data).select("id").single()` e retornar `string | null` (o ID criado)
- O `handleCreate` no componente fara um loop sequencial chamando `addEmpreendimento` para cada projeto selecionado
- O componente `Checkbox` de `@/components/ui/checkbox` sera usado para a selecao multipla
- Nenhuma migracao de banco necessaria -- as tabelas e funcoes ja existem
