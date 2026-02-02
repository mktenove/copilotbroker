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
          ? "bg-[hsl(var(--mc-cream))] py-4"
          : "bg-transparent py-8"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo - Monocolor */}
          <div className="flex items-center gap-4">
            <img
              src={logoEnove}
              alt="Enove"
              className={`h-7 md:h-8 w-auto transition-all duration-500 ${
                isScrolled 
                  ? "brightness-0" 
                  : "brightness-0 invert"
              }`}
            />
            {brokerName && (
              <span className={`text-xs tracking-[0.1em] uppercase border-l pl-4 hidden sm:inline transition-colors duration-500 ${
                isScrolled 
                  ? "text-[hsl(var(--mc-charcoal))] border-[hsl(var(--mc-charcoal))]/20" 
                  : "text-white/80 border-white/30"
              }`}>
                {brokerName}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {["conceito", "apartamentos", "lazer", "investimento"].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className={`text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[hsl(var(--mc-charcoal))] hover:text-[hsl(var(--mc-sage))]"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {section === "lazer" ? "Wellness" : section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
            <button
              onClick={() => scrollToSection("cadastro")}
              className="px-6 py-2.5 bg-[hsl(var(--mc-forest))] text-white text-xs uppercase tracking-[0.15em] font-medium rounded hover:bg-[hsl(var(--mc-charcoal))] transition-all duration-300"
            >
              Cadastrar
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 transition-colors ${
              isScrolled ? "text-[hsl(var(--mc-charcoal))]" : "text-white"
            }`}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className={`md:hidden mt-6 pb-6 border-t pt-6 space-y-4 ${
            isScrolled 
              ? "border-[hsl(var(--mc-charcoal))]/10" 
              : "border-white/20"
          }`}>
            {["conceito", "apartamentos", "lazer", "investimento"].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className={`block w-full text-left py-2 text-sm uppercase tracking-[0.1em] ${
                  isScrolled 
                    ? "text-[hsl(var(--mc-charcoal))]" 
                    : "text-white"
                }`}
              >
                {section === "lazer" ? "Wellness" : section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
            <button
              onClick={() => scrollToSection("cadastro")}
              className="block w-full mt-4 px-6 py-3 bg-[hsl(var(--mc-forest))] text-white text-center text-sm uppercase tracking-[0.1em] font-medium rounded"
            >
              Cadastrar
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default MCHeader;
