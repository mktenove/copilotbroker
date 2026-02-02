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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 bg-[hsl(var(--mc-sage))] text-white font-semibold uppercase tracking-wider text-sm rounded-full shadow-[0_10px_40px_hsl(var(--mc-sage)/0.4)] hover:shadow-[0_15px_50px_hsl(var(--mc-sage)/0.6)] hover:scale-105 transition-all duration-300 animate-float"
    >
      <ArrowUp className="w-4 h-4" />
      Cadastre-se
    </button>
  );
};

export default MCFloatingCTA;
