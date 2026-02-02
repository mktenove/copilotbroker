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
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-24">
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-up">
          {/* Main Headline - More editorial */}
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-normal text-white leading-[1.15] tracking-[0.02em]">
            Quando o endereço é definitivo,
            <br />
            <span className="text-white/90 italic">
              o projeto precisa estar à altura.
            </span>
          </h1>

          {/* Subtitle - Pure white */}
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-[1.8] tracking-wide">
            Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, 
            surge um empreendimento residencial que redefine o morar contemporâneo.
          </p>

          {/* Tagline - Editorial spacing */}
          <div className="pt-4">
            <p className="text-xs md:text-sm uppercase tracking-[0.4em] text-white/60 font-medium">
              Não é apenas um novo prédio — É um novo patamar
            </p>
          </div>

          {/* CTA Button - Larger, with subtle pulse */}
          <div className="pt-8">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[hsl(var(--mc-forest))] font-medium uppercase tracking-[0.2em] text-xs rounded hover:bg-[hsl(var(--mc-sage-light))] hover:text-white transition-all duration-500 hover:scale-[1.02]"
            >
              Quero receber informações
            </button>
          </div>
        </div>

        {/* Scroll Indicator - Minimal line */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-float">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default MCHeroSection;
