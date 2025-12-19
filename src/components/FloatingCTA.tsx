import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const FloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById("sobre");
      const formSection = document.getElementById("cadastro");
      
      if (heroSection && formSection) {
        const heroBottom = heroSection.offsetTop;
        const formTop = formSection.offsetTop - window.innerHeight;
        const scrollY = window.scrollY;
        
        setIsVisible(scrollY > heroBottom / 2 && scrollY < formTop);
        setShowScrollTop(scrollY > 500);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Floating CTA Button */}
      <button
        onClick={scrollToForm}
        className={`floating-cta transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
      >
        Quero Acesso Antecipado
      </button>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary transition-all duration-300 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="Voltar ao topo"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default FloatingCTA;
