import { useState, useEffect } from "react";
import logoGoldenView from "@/assets/goldenview/logo-goldenview.png";

const GVHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-primary/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container flex items-center justify-between px-4">
        <img
          src={logoGoldenView}
          alt="GoldenView Residencial"
          className="h-10 sm:h-12 md:h-14 w-auto"
        />
        
        <button
          onClick={scrollToForm}
          className="hidden sm:inline-flex btn-primary text-xs px-4 py-2.5 sm:px-6 sm:py-3"
        >
          Quero Acesso
        </button>
      </div>
    </header>
  );
};

export default GVHeader;
