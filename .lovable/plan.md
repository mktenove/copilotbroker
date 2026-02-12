

## Corrigir logout inacessivel no iPad

### Problema
No iPad (tela de 768px a 1024px em modo retrato), o sistema usa o layout desktop (sidebar lateral) em vez do layout mobile (barra inferior). O botao de logout na sidebar e um icone pequeno no canto inferior, dificil de localizar e tocar em dispositivos touch. A barra inferior mobile -- que tem o menu "Mais" com opcao de "Sair" -- esta oculta por causa do breakpoint `md:hidden` (768px).

### Solucao
Alterar o breakpoint de transicao entre layout mobile e desktop de `md` (768px) para `lg` (1024px). Assim, iPads em modo retrato (768-1024px) usarao a navegacao inferior com o menu "Mais" que contem o logout.

### Arquivos afetados

**1. `src/components/broker/BrokerBottomNav.tsx`**
- Mudar `md:hidden` para `lg:hidden` na nav principal

**2. `src/components/broker/BrokerSidebar.tsx`**
- Mudar `hidden md:flex` para `hidden lg:flex`

**3. `src/components/broker/BrokerLayout.tsx`**
- Mudar `md:ml-16` para `lg:ml-16` no container principal
- Mudar `md:pb-0` para `lg:pb-0` no padding inferior

**4. `src/pages/BrokerAdmin.tsx`**
- Mudar `md:hidden` para `lg:hidden` no bloco de busca mobile (se houver)

**5. `src/components/broker/BrokerHeader.tsx`** (verificar se tem breakpoints `md:` relacionados ao layout)

### Impacto
- iPads em retrato (768-1024px) passam a usar a barra inferior com acesso completo ao menu "Mais" (incluindo Sair)
- iPads em paisagem (1024px+) continuam usando a sidebar desktop
- Desktops nao sao afetados
- Nenhuma mudanca de banco de dados necessaria

