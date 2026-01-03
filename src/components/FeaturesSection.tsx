import { useEffect, useRef, useState } from "react";
import { MapPin, Ruler, Cable, Waves, Home, Eye } from "lucide-react";

const features = [
  { icon: Home, title: "Condomínio fechado de terrenos" },
  { icon: MapPin, title: "300 lotes exclusivos" },
  { icon: Ruler, title: "Terrenos amplos, a partir de 500m²" },
  { icon: Cable, title: "Fiação subterrânea" },
  { icon: Waves, title: "Piscina aquecida" },
  { icon: Eye, title: "Vista simplesmente deslumbrante" },
];

const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Decorative Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container relative z-10">
        <div className={`text-center mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <h2 className="section-title mb-4">
            O Que Já Podemos <span className="text-primary">Antecipar</span>
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Algumas informações já são certas — e suficientes para entender a grandiosidade do projeto:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`card-luxury flex items-center gap-4 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`}
              style={{ animationDelay: `${index * 100 + 200}ms` }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">{feature.title}</p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className={`text-center max-w-2xl mx-auto ${isVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '800ms' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 animate-glow">
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-xl text-foreground/90 font-medium mb-2">
            Infraestrutura de altíssimo padrão
          </p>
          <p className="text-muted-foreground">
            O restante? Será revelado apenas para quem estiver na lista.
          </p>
        </div>
      </div>
      
      {/* Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  );
};

export default FeaturesSection;
