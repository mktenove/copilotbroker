import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    document.getElementById("sobre")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/90" />
      
      {/* Subtle Grain Texture */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]" />

      {/* Content */}
      <div className="relative z-10 container text-center px-4 pt-20">
        <div className={`space-y-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-primary text-sm font-medium uppercase tracking-wider">
              Pré-Lançamento Exclusivo
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] max-w-5xl mx-auto">
            O Maior Lançamento Imobiliário de{" "}
            <span className="text-primary">Estância Velha</span>{" "}
            Está Prestes a Ser Revelado
          </h1>

          {/* Subtitle */}
          <p className="font-serif text-xl md:text-2xl text-foreground/80 italic max-w-2xl mx-auto">
            Poucas pessoas terão acesso primeiro.
          </p>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A maioria vai descobrir quando já for tarde.
          </p>

          {/* CTA Button */}
          <div className="pt-6">
            <button onClick={scrollToForm} className="btn-primary">
              Quero Acesso Antecipado
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <button 
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 p-2 rounded-full border border-foreground/20 hover:border-primary/50 text-foreground/70 hover:text-primary transition-colors cursor-pointer animate-bounce"
          aria-label="Scroll para baixo"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
