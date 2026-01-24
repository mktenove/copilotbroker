import { useState, useEffect } from "react";

const GVFloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling past hero section
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToForm}
      className="floating-cta"
      aria-label="Ir para o cadastro"
    >
      Quero Acesso Antecipado
    </button>
  );
};

export default GVFloatingCTA;
