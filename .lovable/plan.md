

## Plano: Botão de Instalação PWA Clicável

### Contexto
Atualmente, o aviso "Instale o app" na página de login é apenas texto informativo. O objetivo é transformá-lo em um botão funcional que acione a instalação do PWA diretamente.

### Abordagem Técnica

A Web possui uma API nativa chamada `beforeinstallprompt` que permite capturar o prompt de instalação do navegador e acioná-lo programaticamente via botão. No iOS/Safari, essa API não existe — nesse caso, exibiremos as instruções manuais como fallback.

### Alterações em `src/pages/Auth.tsx`

1. **Adicionar estados para controlar o prompt PWA:**
   - `deferredPrompt` — armazena o evento `beforeinstallprompt`
   - `isInstallable` — indica se o navegador suporta instalação nativa
   - `isIOS` — detecta se é iOS (fallback com instruções manuais)

2. **Adicionar `useEffect` para capturar o evento `beforeinstallprompt`:**
   - Escuta o evento global e salva no estado
   - Detecta iOS via `userAgent`

3. **Substituir o bloco "PWA Install Hint" (linhas 241-253) por um botão interativo:**
   - **Em Android/Desktop (Chrome, Edge):** Botão clicável com ícone `Download` que aciona `deferredPrompt.prompt()` e aguarda a resposta do usuário
   - **Em iOS:** Mantém as instruções manuais (toque em Compartilhar → Adicionar à Tela Início) pois o Safari não suporta a API
   - **Se já instalado:** Oculta o botão completamente (via evento `appinstalled`)

4. **Estilo do botão:** Consistente com o design atual — fundo `bg-[#0f0f12]`, borda `border-[#2a2a2e]`, com hover interativo e cursor pointer.

### Resultado Esperado
- Em navegadores compatíveis: botão "Instalar App" que abre o diálogo nativo de instalação com um clique
- Em iOS: instruções visuais de como adicionar manualmente à tela inicial
- Após instalação: o botão desaparece automaticamente

