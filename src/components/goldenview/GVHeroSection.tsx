import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import aerialView from "@/assets/goldenview/aerial-view.png";

const GVHeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Preload hero image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = aerialView;
    
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    document.getElementById("parceiros")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundImage: `url(${aerialView})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      
      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      {/* Content */}
      <div className="relative z-10 container px-4 pt-24 pb-16 text-center">
        <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 border border-primary/40 rounded-full bg-primary/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-primary">
              Pré-Lançamento Exclusivo
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight">
            O LANÇAMENTO QUE{" "}
            <span className="text-gold-gradient">PORTÃO</span>{" "}
            ESPERAVA HÁ ANOS
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl md:text-3xl font-serif italic text-primary mb-8">
            E que vai acabar rápido.
          </p>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 max-w-2xl mx-auto leading-relaxed">
            Em breve, Portão vai viver o maior e mais desejado lançamento imobiliário da sua história recente.
          </p>

          <p className="text-sm sm:text-base text-white/70 mb-8 max-w-2xl mx-auto">
            Um condomínio fechado de terrenos de alto padrão, criado para um público seleto — e assinado por duas das empresas mais respeitadas da região:
          </p>

          {/* Partners */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-wide">
              CONSTRUSINOS
            </span>
            <span className="text-primary text-2xl">+</span>
            <span className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-wide">
              MARICLER
            </span>
          </div>

          <p className="text-sm text-white/60 italic mb-10">
            Quando essas duas marcas se unem, o mercado presta atenção.
            <br />
            E quem entende de imóvel, se antecipa.
          </p>

          {/* CTA */}
          <button
            onClick={scrollToForm}
            className="btn-primary text-sm sm:text-base px-8 py-4 sm:px-10 sm:py-5"
          >
            Quero Acesso Antecipado Agora
          </button>
        </div>

        {/* Scroll Indicator */}
        <button
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-primary transition-colors animate-bounce"
          aria-label="Rolar para baixo"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
};

export default GVHeroSection;
