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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  const navItems = ["conceito", "apartamentos", "lazer", "investimento"];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-safe ${
          isScrolled
            ? "bg-[hsl(var(--mc-cream))] py-3 md:py-4 shadow-sm"
            : "bg-transparent py-4 md:py-8"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Logo - Monocolor */}
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src={logoEnove}
                alt="Enove"
                className={`h-6 md:h-8 w-auto transition-all duration-500 ${
                  isScrolled 
                    ? "brightness-0" 
                    : "brightness-0 invert"
                }`}
              />
              {brokerName && (
                <span className={`text-[10px] md:text-xs tracking-[0.1em] uppercase border-l pl-3 md:pl-4 hidden sm:inline transition-colors duration-500 ${
                  isScrolled 
                    ? "text-[hsl(var(--mc-charcoal))] border-[hsl(var(--mc-charcoal))]/20" 
                    : "text-white/80 border-white/30"
                }`}>
                  {brokerName}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10">
              {navItems.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-300 ${
                    isScrolled
                      ? "text-[hsl(var(--mc-charcoal))] hover:text-[hsl(var(--mc-forest))]"
                      : "text-white/90 hover:text-white"
                  }`}
                >
                  {section === "lazer" ? "Wellness" : section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
              <button
                onClick={() => scrollToSection("cadastro")}
                className="px-5 lg:px-6 py-2.5 bg-[hsl(var(--mc-forest))] text-white text-xs uppercase tracking-[0.15em] font-medium rounded hover:bg-[hsl(var(--mc-charcoal))] transition-all duration-300"
              >
                Quero Acesso Antecipado
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                isScrolled ? "text-[hsl(var(--mc-charcoal))]" : "text-white"
              }`}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation - Full screen overlay with solid background */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel - Solid cream background */}
          <nav className="absolute top-16 left-4 right-4 bg-[hsl(var(--mc-cream))] rounded-lg shadow-2xl p-6 animate-fade-up">
            <div className="space-y-2">
              {navItems.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className="block w-full text-left py-4 px-4 text-sm uppercase tracking-[0.1em] text-[hsl(var(--mc-charcoal))] hover:bg-[hsl(var(--mc-stone))] rounded-md transition-colors min-h-[48px]"
                >
                  {section === "lazer" ? "Wellness" : section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-[hsl(var(--mc-sage))]/20">
              <button
                onClick={() => scrollToSection("cadastro")}
                className="w-full py-4 bg-[hsl(var(--mc-forest))] text-white text-center text-sm uppercase tracking-[0.1em] font-medium rounded-md hover:bg-[hsl(var(--mc-charcoal))] transition-colors min-h-[48px]"
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
