import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const MCFloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 800px (more delay to be less intrusive)
      setIsVisible(window.scrollY > 800);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    const element = document.getElementById("cadastro");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToForm}
      className="fixed bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 sm:px-6 md:px-8 py-3 md:py-4 bg-[hsl(var(--mc-forest))] text-white font-medium uppercase tracking-[0.15em] md:tracking-[0.2em] text-[10px] sm:text-xs shadow-lg hover:bg-[hsl(var(--mc-charcoal))] transition-all duration-300 min-h-[44px]"
    >
      <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">Cadastrar</span>
      <span className="sm:hidden">Cadastrar</span>
    </button>
  );
};

export default MCFloatingCTA;
