import copilotLogo from "@/assets/copilot-logo-dark.png";

const CopilotFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-10 bg-background border-t border-border/30" role="contentinfo">
      <div className="container">
        <div className="flex flex-col items-center gap-5">
          <img src={copilotLogo} alt="Copilot Broker" className="h-8 w-auto" loading="lazy" />

          <nav className="flex gap-6 text-sm text-muted-foreground">
            <a href="/termos" className="hover:text-foreground transition-colors">Termos</a>
            <a href="/auth" className="hover:text-foreground transition-colors">Login</a>
            <a href="/planos" className="hover:text-foreground transition-colors">Planos</a>
          </nav>

          <div className="divider-gold" aria-hidden="true" />

          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
            © {currentYear} Copilot Broker. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default CopilotFooter;
