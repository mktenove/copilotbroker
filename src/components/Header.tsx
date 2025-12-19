import logoEnove from "@/assets/logo-enove.png";

const Header = () => {
  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="container flex items-center justify-between py-4">
        <a 
          href="https://www.enoveimobiliaria.com.br/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img 
            src={logoEnove} 
            alt="Enove Imobiliária" 
            className="h-10 md:h-12 w-auto"
          />
        </a>
        
        <button
          onClick={scrollToForm}
          className="hidden md:inline-flex btn-outline text-xs"
        >
          Quero Acesso Antecipado
        </button>
      </div>
    </header>
  );
};

export default Header;
