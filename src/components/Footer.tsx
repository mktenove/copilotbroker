import logoEnove from "@/assets/logo-enove.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-10 bg-background border-t border-border/30">
      <div className="container">
        <div className="flex flex-col items-center gap-6">
          <a 
            href="https://www.enoveimobiliaria.com.br/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <img 
              src={logoEnove} 
              alt="Enove Imobiliária" 
              className="h-10 w-auto"
            />
          </a>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Uma realização <span className="text-primary font-medium">Ábaco Incorporadora</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Comercialização: <span className="text-foreground/80 font-medium">Enove Imobiliária</span>
            </p>
          </div>
          
          <div className="divider-gold" />
          
          <p className="text-xs text-muted-foreground">
            © {currentYear} Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
