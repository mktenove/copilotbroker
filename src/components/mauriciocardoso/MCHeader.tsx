import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";

interface MCHeaderProps {
  brokerName?: string;
}

const MCHeader = ({ brokerName }: MCHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: "localizacao", label: "Localização" },
    { id: "diferenciais", label: "Diferenciais" },
    { id: "perfil", label: "Para Quem" },
    { id: "beneficios", label: "Benefícios" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-safe ${
          isScrolled
            ? "bg-charcoal/95 backdrop-blur-md border-b border-primary/20 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src={logoEnove}
                alt="Enove"
                className="h-6 md:h-8 w-auto brightness-0 invert opacity-80"
              />
              {brokerName && (
                <span className="text-[10px] md:text-xs tracking-[0.1em] uppercase border-l pl-3 md:pl-4 hidden sm:inline text-white/80 border-white/30">
                  {brokerName}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-xs uppercase tracking-[0.15em] font-medium text-white/70 hover:text-primary transition-colors duration-300"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => scrollToSection("cadastro")}
                className="btn-primary text-xs px-4 py-2.5 sm:px-6 sm:py-3"
              >
                Quero Acesso Antecipado
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <nav className="absolute top-16 left-4 right-4 bg-card rounded-lg shadow-2xl p-6 border border-border/50 animate-fade-up">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left py-4 px-4 text-sm uppercase tracking-[0.1em] text-foreground hover:bg-muted rounded-md transition-colors min-h-[48px]"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/30">
              <button
                onClick={() => scrollToSection("cadastro")}
                className="w-full btn-primary min-h-[48px]"
              >
                Quero Acesso Antecipado
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

export default MCHeader;
