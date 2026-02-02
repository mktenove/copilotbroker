import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const MCFloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 500px
      setIsVisible(window.scrollY > 500);
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
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-8 py-4 bg-[hsl(var(--mc-forest))] text-white font-medium uppercase tracking-[0.2em] text-xs rounded-sm shadow-[0_10px_40px_hsl(var(--mc-forest)/0.5)] hover:bg-[hsl(var(--mc-charcoal))] transition-all duration-300 animate-float"
    >
      <ArrowUp className="w-4 h-4" />
      Cadastrar
    </button>
  );
};

export default MCFloatingCTA;
