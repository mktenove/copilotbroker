import logoEnove from "@/assets/logo-enove.png";

const Header = () => {
  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-40 bg-charcoal/95 backdrop-blur-md border-b border-white/10 pt-safe"
      role="banner"
    >
      <nav 
        className="container flex items-center justify-between py-3 sm:py-4"
        aria-label="Navegação principal"
      >
        <a 
          href="https://www.enoveimobiliaria.com.br/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
          aria-label="Visitar site da Enove Imobiliária (abre em nova aba)"
        >
          <img 
            src={logoEnove} 
            alt="Enove Imobiliária - Logo" 
            className="h-8 sm:h-10 md:h-12 w-auto"
            width="120"
            height="48"
            loading="eager"
          />
        </a>
        
        <button
          onClick={scrollToForm}
          className="hidden sm:inline-flex btn-outline text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Ir para formulário de cadastro"
        >
          Quero Mais Informações
        </button>
      </nav>
    </header>
  );
};

export default Header;
