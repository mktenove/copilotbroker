import piscinaImage from "@/assets/mauriciocardoso/piscina-wellness.jpg";

const MCWellnessSection = () => {
  return (
    <section id="lazer" className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-forest))] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
            {/* Content - White text for contrast on dark background */}
            <div className="space-y-6 md:space-y-10 text-white order-2 lg:order-1">
              {/* Section Label */}
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-medium">
                Wellness
              </span>
              
              {/* Title */}
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.2]">
                Lazer, Wellness e
                <br />
                <span className="italic text-white/90">
                  Qualidade de Vida
                </span>
              </h2>

              {/* Area Highlight - Typography focus */}
              <div className="py-4 md:py-8">
                <div className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light text-white leading-none">
                  1.800
                  <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl ml-2 text-white/70">m²</span>
                </div>
                <p className="text-white/60 mt-2 md:mt-3 text-xs sm:text-sm tracking-wide">
                  dedicados ao bem-estar
                </p>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/90 leading-[1.8] md:leading-[1.9] max-w-md">
                Uma área de lazer completa, planejada para proporcionar experiências 
                reais de descanso, convivência e equilíbrio. Espaços que valorizam o 
                tempo, a saúde e a qualidade de vida.
              </p>

              {/* Features - Minimal with good contrast */}
              <div className="flex flex-wrap gap-4 md:gap-6 pt-2 md:pt-4">
                {["Piscina", "Fitness", "Solário", "Jardins"].map((item, index) => (
                  <span 
                    key={index}
                    className="text-[10px] sm:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/70"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="border-l border-white/30 pl-4 md:pl-6 pt-2 md:pt-4">
                <p className="font-serif text-base sm:text-lg md:text-xl text-white/90 italic leading-relaxed">
                  "Viver bem também é saber desacelerar no lugar certo."
                </p>
              </blockquote>
            </div>

            {/* Image */}
            <div className="order-1 lg:order-2">
              <img
                src={piscinaImage}
                alt="Área de lazer e wellness"
                className="w-full object-cover aspect-[4/3] md:aspect-[4/5] lg:aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCWellnessSection;
