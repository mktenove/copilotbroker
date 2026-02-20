import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import predioImage from "@/assets/mauriciocardoso/predio.png";

const MCHeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = predioImage;
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    document.getElementById("localizacao")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Image */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundImage: `url(${predioImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        role="img"
        aria-label="Fachada do empreendimento Mauricio Cardoso em Novo Hamburgo"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Gold accent line */}
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
          <h1
            id="hero-heading"
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight"
          >
            QUANDO O ENDEREÇO É DEFINITIVO,{" "}
            <span className="text-gold-gradient">O PROJETO PRECISA ESTAR À ALTURA</span>
          </h1>

          {/* Divider */}
          <div className="w-16 h-px bg-primary/50 mx-auto mb-8" />

          <p className="text-sm sm:text-base text-white/70 mb-10 max-w-2xl mx-auto">
            Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo,
            surge um empreendimento residencial que redefine o morar contemporâneo.
          </p>

          {/* CTA */}
          <button
            onClick={scrollToForm}
            className="btn-primary text-sm sm:text-base px-8 py-4 sm:px-10 sm:py-5"
            aria-label="Quero acesso antecipado ao empreendimento"
          >
            Quero Acesso Antecipado
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

export default MCHeroSection;
