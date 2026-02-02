import piscinaImage from "@/assets/mauriciocardoso/piscina-wellness.jpg";

const MCWellnessSection = () => {
  return (
    <section id="lazer" className="py-24 md:py-40 bg-[hsl(var(--mc-forest))] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div className="space-y-10 text-white order-2 lg:order-1">
              {/* Section Label */}
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/50 font-medium">
                Wellness
              </span>
              
              {/* Title */}
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.2]">
                Lazer, Wellness e
                <br />
                <span className="italic text-[hsl(var(--mc-sage-light))]">
                  Qualidade de Vida
                </span>
              </h2>

              {/* Area Highlight - Typography focus */}
              <div className="py-8">
                <div className="font-serif text-6xl md:text-7xl lg:text-8xl font-light text-white leading-none">
                  1.800
                  <span className="text-2xl md:text-3xl ml-2 text-white/60">m²</span>
                </div>
                <p className="text-white/50 mt-3 text-sm tracking-wide">
                  dedicados ao bem-estar
                </p>
              </div>

              {/* Description */}
              <p className="text-base text-white/80 leading-[1.9] max-w-md">
                Uma área de lazer completa, planejada para proporcionar experiências 
                reais de descanso, convivência e equilíbrio. Espaços que valorizam o 
                tempo, a saúde e a qualidade de vida.
              </p>

              {/* Features - Minimal */}
              <div className="flex flex-wrap gap-6 pt-4">
                {["Piscina", "Fitness", "Solário", "Jardins"].map((item, index) => (
                  <span 
                    key={index}
                    className="text-xs uppercase tracking-[0.2em] text-white/60"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="border-l border-[hsl(var(--mc-sage-light))]/50 pl-6 pt-4">
                <p className="font-serif text-lg md:text-xl text-[hsl(var(--mc-sage-light))] italic leading-relaxed">
                  "Viver bem também é saber desacelerar no lugar certo."
                </p>
              </blockquote>
            </div>

            {/* Image */}
            <div className="order-1 lg:order-2">
              <img
                src={piscinaImage}
                alt="Área de lazer e wellness"
                className="w-full object-cover aspect-[4/5] md:aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCWellnessSection;
