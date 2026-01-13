import logoEnove from "@/assets/logo-enove.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="py-8 sm:py-10 bg-background border-t border-border/30"
      role="contentinfo"
      aria-label="Rodapé"
    >
      <div className="container">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
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
              className="h-8 sm:h-10 w-auto"
              width="100"
              height="40"
              loading="lazy"
            />
          </a>
          
          <address className="text-center space-y-2 not-italic">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Uma realização{" "}
              <span className="text-primary font-medium">Ábaco Incorporadora</span>
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comercialização:{" "}
              <span className="text-foreground/80 font-medium">Enove Imobiliária</span>
            </p>
          </address>
          
          <div className="divider-gold" role="separator" aria-hidden="true" />
          
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            © {currentYear} Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
