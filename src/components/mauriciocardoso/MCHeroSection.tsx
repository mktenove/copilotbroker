import predioImage from "@/assets/mauriciocardoso/predio.png";

const MCHeroSection = () => {
  const scrollToForm = () => {
    const element = document.getElementById("cadastro");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${predioImage})` }}
      />
      
      {/* Overlay - More dramatic */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--mc-forest))]/85 via-[hsl(var(--mc-forest))]/60 to-[hsl(var(--mc-charcoal))]/95" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-20 md:pt-24">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-fade-up">
          {/* Main Headline - Mobile optimized */}
          <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-normal text-white leading-[1.2] md:leading-[1.15] tracking-[0.02em]">
            Quando o endereço é definitivo,
            <br />
            <span className="text-white/90 italic">
              o projeto precisa estar à altura.
            </span>
          </h1>

          {/* Subtitle - Pure white for contrast */}
          <p className="text-sm sm:text-base md:text-lg text-white max-w-2xl mx-auto leading-[1.7] md:leading-[1.8] tracking-wide px-2">
            Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, 
            surge um empreendimento residencial que redefine o morar contemporâneo.
          </p>

          {/* Tagline - Editorial spacing */}
          <div className="pt-2 md:pt-4">
            <p className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/70 font-medium px-4">
              NÃO É APENAS UM NOVO PRÉDIO, É UM NOVO PATAMAR
            </p>
          </div>

          {/* CTA Button - Mobile optimized */}
          <div className="pt-4 md:pt-8">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 md:gap-3 px-6 sm:px-8 md:px-10 py-4 md:py-5 bg-white text-[hsl(var(--mc-forest))] font-medium uppercase tracking-[0.15em] md:tracking-[0.2em] text-[11px] sm:text-xs rounded hover:bg-[hsl(var(--mc-sage-light))] hover:text-white transition-all duration-500 hover:scale-[1.02] min-h-[48px]"
            >
              Quero receber informações
            </button>
          </div>
        </div>

        {/* Scroll Indicator - Hidden on small mobile */}
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex-col items-center gap-3 animate-float hidden sm:flex">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Scroll</span>
          <div className="w-px h-10 md:h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default MCHeroSection;
