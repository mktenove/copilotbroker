

# Redesign Completo: Modulo de Importacao CSV

## Visao Geral

Reescrever completamente o modulo de importacao CSV com um fluxo multi-etapas profissional, suporte a Google Contacts CSV, mapeamento de colunas personalizavel, normalizacao avancada de telefones (compativel UAZAPI), e controle de duplicidade configuravel. Disponivel para Admin, Lider e Corretor.

## Arquitetura de Arquivos

```text
src/
  lib/
    csv-parser.ts          -- REESCREVER (parser + normalizador avancado)
  components/
    admin/
      CsvImportModal.tsx   -- REESCREVER (wizard multi-etapas)
```

Nenhuma tabela nova sera criada. O modulo continua inserindo na tabela `leads` existente e `lead_attribution`. Nao sera necessario criar tabela de logs separada -- o log sera exibido em tela ao final da importacao e registrado como `lead_interactions` para auditoria.

---

## Fluxo UX: 6 Etapas (Wizard)

O modal sera substituido por um wizard com barra de progresso de etapas no topo.

### Etapa 1 -- Upload

- Titulo: "Importar Contatos (CSV)"
- Explicacao: "Exporte seus contatos do Google em CSV e envie aqui."
- Dropzone com drag-and-drop (.csv, max 10MB)
- Link/tooltip com instrucoes: "Google Contatos -> Exportar -> CSV Google"
- Validacao de tamanho (10MB max) e extensao (.csv)
- Deteccao automatica de delimitador (virgula ou ponto-e-virgula) e encoding UTF-8
- Aviso se arquivo vazio ou ilegivel

### Etapa 2 -- Pre-visualizacao

- Tabela com as primeiras 20 linhas do CSV (todas as colunas detectadas)
- Exibir total de linhas, total de colunas
- Scroll horizontal para CSVs com muitas colunas
- Botao "Proximo" para avancar

### Etapa 3 -- Mapeamento de Campos

- Para cada campo do CRM, um dropdown listando as colunas do CSV + opcao "Ignorar"
- Campos do CRM:
  - **Nome** (obrigatorio) -- permitir selecionar 1 ou 2 colunas para concatenar (ex: "First Name" + "Last Name")
  - **Telefone Principal** (obrigatorio para WhatsApp)
  - **Origem** (opcional, default: "Importacao Google Contacts")
- Auto-deteccao inteligente baseada nos headers do CSV (ex: "First Name" sugere Nome, "Phone 1 - Value" sugere Telefone)
- Toggle "Concatenar campos para Nome" (ex: First Name + Last Name)
- Validacao: nao permitir avancar sem Nome e Telefone mapeados

### Etapa 4 -- Regras de Importacao

- **Duplicidade** (radio):
  - "Ignorar duplicados" (default)
  - "Criar mesmo assim" (aviso: nao recomendado)
- **Criterio de duplicidade**: telefone normalizado (unico criterio, simplificado)
- **Toggle**: "Corrigir 9o digito automaticamente" (default: ativado)
- **Atribuicao**:
  - Selecao de Empreendimento (obrigatorio)
  - Selecao de Origem padrao (default: "importacao_google_contacts")
  - Toggle "Atribuir ao corretor" (apenas Admin/Lider) + dropdown de corretores
  - Para corretores: leads vao automaticamente para o proprio broker_id

### Etapa 5 -- Validacao e Resumo

- Rodar validador e mostrar resumo:
  - Total de linhas
  - Validos (prontos para importar)
  - Invalidos (sem nome / sem telefone)
  - Telefones corrigidos (9o digito inserido)
  - Duplicados detectados (no arquivo e no banco)
- Tabela colapsavel mostrando linhas invalidas com motivo do erro
- Tabela colapsavel mostrando telefones que foram corrigidos
- Botao "Importar X contatos"

### Etapa 6 -- Importacao + Resultado

- Barra de progresso com contagem (ex: "150 de 320")
- Importacao em batches de 200 linhas
- Ao final: relatorio com cards de metricas
  - Importados com sucesso
  - Erros
  - Duplicados ignorados
  - Telefones corrigidos
- Botao "Fechar"

---

## Normalizacao de Telefone (UAZAPI)

Reescrever `normalize_phone()` em `csv-parser.ts`:

1. Remover tudo que nao for digito
2. Se comecar com "00" (discagem internacional), remover "00"
3. Se tiver 10 ou 11 digitos e NAO comecar com 55: adicionar "55"
4. Se tiver 12 ou 13 digitos e comecar com 55: ok
5. Se tiver 8 ou 9 digitos (sem DDD): marcar como invalido ("precisa DDD")
6. Regra do 9o digito: se DDD + numero tiver 10 digitos apos "55" (ex: 55DD8xxxxxxx) e opcao habilitada, inserir "9" apos o DDD e registrar correcao no log
7. Formato final: somente digitos com prefixo 55 (ex: 5551999999999)
8. Preservar telefone original para auditoria no log da importacao

---

## Detalhes Tecnicos

### `src/lib/csv-parser.ts` (reescrever)

- `parseCsvText(text, delimiter?)` -- parser com suporte a delimitador configuravel
- `detectDelimiter(firstLine)` -- detecta virgula vs ponto-e-virgula
- `autoDetectMapping(headers)` -- sugere mapeamento automatico baseado em aliases expandidos (incluindo Google Contacts: "First Name", "Last Name", "Phone 1 - Value", "Phone 2 - Value", etc.)
- `normalizePhone(input, autoFix9thDigit)` -- normalizacao completa conforme regras acima, retorna `{ normalized, original, wasFixed, fixDescription, isValid, error }`
- `validateRow(row, mapping)` -- valida uma linha individual
- `processImportData(rows, mapping, options)` -- processa todas as linhas e retorna resumo completo

### `src/components/admin/CsvImportModal.tsx` (reescrever)

- Wizard com estado `step` (1-6)
- Barra de progresso visual no topo (stepper)
- Estado centralizado:
  - `rawRows: Record<string, string>[]` -- dados brutos parseados
  - `headers: string[]` -- colunas do CSV
  - `mapping: Record<string, string>` -- mapeamento coluna CSV -> campo CRM
  - `concatNameFields: string[]` -- colunas para concatenar como nome
  - `duplicateStrategy: 'ignore' | 'create'`
  - `autoFix9thDigit: boolean`
  - `projectId, origin, brokerId` -- configuracoes de importacao
- Compatibilidade com props existentes (`isOpen, onClose, onSuccess, defaultBrokerId, hideBrokerSelect`)
- Importacao em batches de 200, inserindo em `leads` e `lead_attribution`
- Sanitizacao de strings (trim, remover caracteres de controle)

### Permissoes

- `hideBrokerSelect` continua controlando se o dropdown de corretor aparece
- Corretores: leads vao para seu proprio `broker_id` automaticamente
- Admin/Lider: podem escolher corretor via dropdown ou deixar sem corretor ("Enove")

### Aliases expandidos para Google Contacts CSV

```text
Nome: "First Name", "Last Name", "Name", "Nome", "nome completo", "full name"
Telefone: "Phone 1 - Value", "Phone 2 - Value", "Phone", "Telefone", "WhatsApp", "Celular", "Mobile"
Origem: "Origem", "Origin", "Source", "Group Membership"
```

---

## Estimativa

- 2 arquivos reescritos: `csv-parser.ts` e `CsvImportModal.tsx`
- 0 alteracoes de banco de dados
- 0 novas dependencias

