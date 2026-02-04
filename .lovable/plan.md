

## Simplificar FAB e Mover Importação CSV para a Página Leads

### Visão Geral

Reverter o botão amarelo (+) para sua função original de **adicionar lead manualmente com um clique**, e mover a opção de **Importar CSV** para dentro da página de Leads, onde faz mais sentido contextualmente.

---

### Alterações Necessárias

#### 1. AdminSidebar - Reverter FAB para Ação Única

**Arquivo:** `src/components/admin/AdminSidebar.tsx`

- Remover o `DropdownMenu` do botão FAB
- Voltar para botão simples que chama `onAddLead` diretamente
- Remover prop `onImportCsv` (não será mais usada aqui)

**De:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <button>+</button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Adicionar Lead</DropdownMenuItem>
    <DropdownMenuItem>Importar CSV</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Para:**
```tsx
<button onClick={onAddLead}>+</button>
```

---

#### 2. BrokerSidebar - Mesma Alteração

**Arquivo:** `src/components/broker/BrokerSidebar.tsx`

- Reverter para botão simples sem dropdown
- Remover prop `onImportCsv`

---

#### 3. MobileBottomNav - Simplificar FAB

**Arquivo:** `src/components/admin/MobileBottomNav.tsx`

- Remover menu overlay do FAB
- FAB chama diretamente `onAddLead`
- Remover prop `onImportCsv`

---

#### 4. BrokerBottomNav - Mesma Alteração

**Arquivo:** `src/components/broker/BrokerBottomNav.tsx`

- Simplificar FAB para ação direta

---

#### 5. Página Admin (aba Leads) - Adicionar Botão Importar CSV

**Arquivo:** `src/pages/Admin.tsx`

Na seção da aba "leads", adicionar um botão "Importar CSV" no cabeçalho junto com os filtros e exportação:

```tsx
{activeTab === "leads" && (
  <>
    {/* Header com ações */}
    <div className="flex justify-end gap-2 mb-4">
      <Button onClick={() => setIsCsvImportOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Importar CSV
      </Button>
      <ExportButton leads={filteredLeads} />
    </div>
    {/* ... resto do conteúdo */}
  </>
)}
```

---

#### 6. Página BrokerAdmin - Adicionar na Visualização Lista

**Arquivo:** `src/pages/BrokerAdmin.tsx`

Adicionar botão "Importar CSV" quando o corretor estiver na visualização de lista:

```tsx
{viewMode === "list" && (
  <div className="flex justify-end gap-2 mb-4">
    <Button onClick={() => setIsCsvImportOpen(true)}>
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      Importar CSV
    </Button>
  </div>
)}
```

---

#### 7. AdminLayout - Remover prop onImportCsv

**Arquivo:** `src/components/admin/AdminLayout.tsx`

- Remover prop `onImportCsv` da interface e propagação

---

#### 8. BrokerLayout - Remover prop onImportCsv

**Arquivo:** `src/components/broker/BrokerLayout.tsx`

- Remover prop `onImportCsv`

---

### Resultado Final

| Componente | Antes | Depois |
|------------|-------|--------|
| Botão amarelo (+) | Dropdown com 2 opções | Clique único → Adicionar Lead |
| Importar CSV | No dropdown do FAB | Botão na página de Leads |
| UX | 2 cliques para adicionar lead | 1 clique para adicionar lead |

---

### Arquivos a Modificar

1. `src/components/admin/AdminSidebar.tsx` - Simplificar FAB
2. `src/components/broker/BrokerSidebar.tsx` - Simplificar FAB
3. `src/components/admin/MobileBottomNav.tsx` - Remover menu overlay
4. `src/components/broker/BrokerBottomNav.tsx` - Remover menu overlay
5. `src/components/admin/AdminLayout.tsx` - Remover prop
6. `src/components/broker/BrokerLayout.tsx` - Remover prop
7. `src/pages/Admin.tsx` - Adicionar botão na aba Leads
8. `src/pages/BrokerAdmin.tsx` - Adicionar botão na visualização lista

