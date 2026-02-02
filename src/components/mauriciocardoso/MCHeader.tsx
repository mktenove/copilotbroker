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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-[hsl(var(--mc-cream))]/95 backdrop-blur-md shadow-lg py-3"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logoEnove}
              alt="Enove"
              className="h-8 md:h-10 w-auto"
            />
            {brokerName && (
              <span className="text-sm text-[hsl(var(--mc-earth))] border-l border-[hsl(var(--mc-sage))] pl-3 hidden sm:inline">
                {brokerName}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("conceito")}
              className="text-sm font-medium text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))] transition-colors"
            >
              Conceito
            </button>
            <button
              onClick={() => scrollToSection("apartamentos")}
              className="text-sm font-medium text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))] transition-colors"
            >
              Apartamentos
            </button>
            <button
              onClick={() => scrollToSection("lazer")}
              className="text-sm font-medium text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))] transition-colors"
            >
              Lazer
            </button>
            <button
              onClick={() => scrollToSection("investimento")}
              className="text-sm font-medium text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))] transition-colors"
            >
              Investimento
            </button>
            <button
              onClick={() => scrollToSection("cadastro")}
              className="px-6 py-2.5 bg-[hsl(var(--mc-sage))] text-white text-sm font-semibold rounded-full hover:bg-[hsl(var(--mc-sage-dark))] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Cadastre-se
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[hsl(var(--mc-earth))]"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-[hsl(var(--mc-sage))]/20 pt-4 space-y-3">
            <button
              onClick={() => scrollToSection("conceito")}
              className="block w-full text-left py-2 text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))]"
            >
              Conceito
            </button>
            <button
              onClick={() => scrollToSection("apartamentos")}
              className="block w-full text-left py-2 text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))]"
            >
              Apartamentos
            </button>
            <button
              onClick={() => scrollToSection("lazer")}
              className="block w-full text-left py-2 text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))]"
            >
              Lazer
            </button>
            <button
              onClick={() => scrollToSection("investimento")}
              className="block w-full text-left py-2 text-[hsl(var(--mc-earth))] hover:text-[hsl(var(--mc-sage-dark))]"
            >
              Investimento
            </button>
            <button
              onClick={() => scrollToSection("cadastro")}
              className="block w-full mt-2 px-6 py-3 bg-[hsl(var(--mc-sage))] text-white text-center font-semibold rounded-full"
            >
              Cadastre-se
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default MCHeader;
