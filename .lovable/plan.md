

## Acesso completo a ferramentas no Admin mobile

### Problema
A barra de navegacao inferior mobile (MobileBottomNav) exibe apenas 5 itens (Notificacoes, CRM, Adicionar Lead, Leads, Logout), enquanto a sidebar desktop tem 7 abas de navegacao + Notificacoes + Configuracoes. Faltam no mobile: **Corretores, Roletas, Empreendimentos, WhatsApp, Analytics e Configuracoes**.

### Solucao
Substituir o botao de Logout por um botao **"Mais"** (icone `MoreHorizontal`) que abre um **Drawer** (desliza de baixo para cima) contendo todas as opcoes que nao cabem na barra principal.

### Layout da barra inferior (5 itens)

```text
[Notificacoes]  [CRM]  (+Adicionar)  [Leads]  [Mais...]
```

### Conteudo do Drawer "Mais"

```text
+----------------------------------+
|          ---- (handle) ----      |
|                                  |
|  Corretores                      |
|  Roletas                         |
|  Empreendimentos                 |
|  WhatsApp                        |
|  Analytics                       |
|  Configuracoes                   |
|  --------------------------------|
|  Sair                            |
+----------------------------------+
```

### Detalhes tecnicos

**Arquivo: `src/components/admin/MobileBottomNav.tsx`**

- Substituir o item `logout` (LogOut) por `more` (MoreHorizontal)
- Adicionar estado `isMoreOpen` para controlar o Drawer
- Ao clicar em "Mais", abrir um `Drawer` (componente vaul ja instalado) com os itens faltantes
- Cada item do Drawer tera icone + label, ao clicar fecha o Drawer e executa `onTabChange(id)` ou `navigate("/admin/whatsapp")` para WhatsApp
- Ao clicar em "Configuracoes", abrir o `SettingsPanel` (importado do AdminSidebar)
- "Sair" fica no final do Drawer, separado por um divisor
- Manter o badge de notificacao no botao de Notificacoes como ja esta

**Arquivo: `src/components/admin/AdminLayout.tsx`**

- Nenhuma mudanca necessaria, pois o MobileBottomNav ja recebe `onTabChange`

**Dependencias**: nenhuma nova, o Drawer (vaul) ja esta instalado e o componente `Drawer` ja existe em `src/components/ui/drawer.tsx`
