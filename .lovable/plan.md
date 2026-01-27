
# Plano: Broker Admin Multi-Empreendimentos

## Visao Geral
Transformar o sistema de corretores para suportar multiplos empreendimentos, permitindo que corretores escolham projetos durante o cadastro, gerenciem seus projetos e gerem links personalizados para cada empreendimento.

---

## 1. Modificar Cadastro de Corretor (`BrokerSignup.tsx`)

### Adicionar Etapa 3: Selecao de Empreendimentos

Expandir o fluxo de 2 para 3 etapas:

| Etapa | Conteudo |
|-------|----------|
| 1. Conta | Email, senha |
| 2. Perfil | Nome, WhatsApp, slug base |
| 3. Empreendimentos | Lista de checkboxes com projetos disponiveis + preview dos links |

### Logica da Etapa 3

```typescript
// Novo estado para projetos
const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

// Buscar projetos ativos ao montar
useEffect(() => {
  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, slug, city, city_slug")
      .eq("is_active", true)
      .order("name");
    setAvailableProjects(data || []);
  };
  fetchProjects();
}, []);

// Gerar preview dos links
const generateProjectLinks = () => {
  return selectedProjectIds.map(projectId => {
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) return null;
    return {
      project,
      url: `/${project.city_slug}/${project.slug}/${profileData.slug}`
    };
  }).filter(Boolean);
};
```

### Interface da Etapa 3

```
┌─────────────────────────────────────────────┐
│  Escolha seus empreendimentos               │
├─────────────────────────────────────────────┤
│  ☑ GoldenView - Portao                      │
│  ☑ O Novo Condominio - Estancia Velha       │
│                                             │
│  ───────────────────────────────────────    │
│                                             │
│  Seus links personalizados:                 │
│                                             │
│  📍 /portao/goldenview/joao-silva          │
│     [Copiar] [Abrir]                        │
│                                             │
│  📍 /estancia-velha/estanciavelha/joao-silva│
│     [Copiar] [Abrir]                        │
│                                             │
│           [Voltar]   [Finalizar Cadastro]   │
└─────────────────────────────────────────────┘
```

### Salvamento Final

Apos criar o broker, inserir registros em `broker_projects` para cada projeto selecionado.

---

## 2. Nova Pagina de Gerenciamento de Empreendimentos

### Criar `src/pages/BrokerProjects.tsx`

Pagina dedicada para corretores gerenciarem seus projetos e links.

### Funcionalidades

1. **Ver projetos atualmente associados**
2. **Adicionar/remover projetos** (escolher entre os ativos)
3. **Ver e copiar link de cada empreendimento**
4. **Editar slug personalizado** (unico para todos os projetos)

### Layout

```
┌──────────────────────────────────────────────────┐
│  Meus Empreendimentos                    [+ Add] │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📍 GoldenView - Portao                     │  │
│  │ /portao/goldenview/joao-silva              │  │
│  │ [Copiar Link] [Abrir Landing] [Remover]    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📍 O Novo Condominio - Estancia Velha      │  │
│  │ /estancia-velha/estanciavelha/joao-silva   │  │
│  │ [Copiar Link] [Abrir Landing] [Remover]    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Seu Link Personalizado                          │
│  Slug: [joao-silva] [Salvar]                     │
│  Nota: Este slug sera usado em todos os links    │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 3. Modificar Broker Admin Principal (`BrokerAdmin.tsx`)

### Substituir Card de Link Unico por Cards Multiplos

```
Antes:
┌─────────────────────────────────┐
│ Sua landing page                │
│ /estanciavelha/joao-silva       │
│ [Copiar] [Abrir]                │
└─────────────────────────────────┘

Depois:
┌─────────────────────────────────────────────────┐
│ Seus Links de Captacao          [Gerenciar →]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ GoldenView                                      │
│ /portao/goldenview/joao-silva    [Copiar][Abrir]│
│                                                 │
│ O Novo Condominio                               │
│ /estancia-velha/.../joao-silva   [Copiar][Abrir]│
│                                                 │
└─────────────────────────────────────────────────┘
```

### Novo Estado

```typescript
interface BrokerProject {
  project: Project;
  url: string;
}

const [brokerProjects, setBrokerProjects] = useState<BrokerProject[]>([]);

// Buscar projetos associados ao corretor
const fetchBrokerProjects = async () => {
  const { data } = await supabase
    .from("broker_projects")
    .select(`
      project:projects(id, name, slug, city, city_slug)
    `)
    .eq("broker_id", brokerId)
    .eq("is_active", true);
  
  const projects = data?.map(bp => ({
    project: bp.project,
    url: `/${bp.project.city_slug}/${bp.project.slug}/${broker?.slug}`
  })) || [];
  
  setBrokerProjects(projects);
};
```

---

## 4. Atualizar Navegacao

### Sidebar Desktop (`BrokerSidebar.tsx`)

Adicionar item de navegacao para "Empreendimentos":

```typescript
const NAV_ITEMS = [
  { id: "kanban", label: "Kanban", icon: LayoutDashboard },
  { id: "list", label: "Lista", icon: List },
  { id: "projects", label: "Empreendimentos", icon: Building2 }, // Novo
];
```

### Bottom Nav Mobile (`BrokerBottomNav.tsx`)

Substituir um item existente ou adicionar acesso via menu de configuracoes.

---

## 5. Atualizar Roteamento (`App.tsx`)

```typescript
// Nova rota para gerenciamento de projetos do corretor
<Route path="/corretor/empreendimentos" element={<BrokerProjects />} />
```

---

## 6. Fluxo de Edicao de Slug

Permitir que corretores editem seu slug na pagina de empreendimentos:

1. Campo editavel com o slug atual
2. Verificacao de disponibilidade em tempo real
3. Ao salvar, atualiza tabela `brokers`
4. Todos os links sao atualizados automaticamente (pois usam o mesmo slug)

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/BrokerProjects.tsx` | Pagina de gerenciamento de empreendimentos |
| `src/hooks/use-broker-projects.ts` | Hook para gerenciar projetos do corretor |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/BrokerSignup.tsx` | Adicionar etapa 3 com selecao de projetos |
| `src/pages/BrokerAdmin.tsx` | Exibir multiplos links em vez de um unico |
| `src/components/broker/BrokerSidebar.tsx` | Adicionar item de navegacao |
| `src/components/broker/BrokerLayout.tsx` | Propagar novo modo de visualizacao |
| `src/App.tsx` | Adicionar nova rota |

---

## Resultado Esperado

1. **Cadastro**: Corretor escolhe empreendimentos e ve todos os links antes de finalizar
2. **Dashboard**: Corretor ve todos os seus links de captacao com acoes rapidas
3. **Gerenciamento**: Pagina dedicada para adicionar/remover projetos e editar slug
4. **Consistencia**: Um unico slug para todos os projetos, mantendo identidade do corretor
