import { ChevronDown } from "lucide-react";
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
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--mc-forest))]/70 via-[hsl(var(--mc-forest))]/40 to-[hsl(var(--mc-cream))]/90" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-20">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
          {/* Main Headline */}
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
            Quando o endereço é definitivo,
            <br />
            <span className="text-[hsl(var(--mc-sage-light))]">
              o projeto precisa estar à altura.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, 
            surge um empreendimento residencial que redefine o morar contemporâneo.
          </p>

          {/* Tagline */}
          <div className="pt-4">
            <p className="text-sm md:text-base uppercase tracking-[0.3em] text-[hsl(var(--mc-sage-light))] font-medium">
              Não é apenas um novo prédio. É um novo patamar.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-10 py-4 bg-[hsl(var(--mc-sage))] text-white font-semibold uppercase tracking-wider text-sm rounded-full shadow-2xl hover:bg-[hsl(var(--mc-sage-dark))] hover:shadow-[0_20px_50px_hsl(var(--mc-sage)/0.4)] transition-all duration-300 hover:scale-105"
            >
              Quero receber informações em primeira mão
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <ChevronDown className="w-8 h-8 text-[hsl(var(--mc-sage))]" />
        </div>
      </div>
    </section>
  );
};

export default MCHeroSection;
