import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const GVFloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const formSection = document.getElementById("cadastro");
      
      if (formSection) {
        const formTop = formSection.offsetTop - window.innerHeight;
        const scrollY = window.scrollY;
        
        // Show CTA after scrolling 600px but hide before form section
        setIsVisible(scrollY > 600 && scrollY < formTop);
        setShowScrollTop(scrollY > 500);
      } else {
        setIsVisible(window.scrollY > 600);
        setShowScrollTop(window.scrollY > 500);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    // GA4 event for CTA click
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'scroll_to_form', {
        event_category: 'Engagement',
        event_label: 'goldenview_floating_cta'
      });
    }
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
        className={`floating-cta transition-all duration-500 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="Ir para o cadastro"
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
      >
        Quero Acesso Antecipado
      </button>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="Voltar ao topo da página"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
      >
        <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
      </button>
    </>
  );
};

export default GVFloatingCTA;
