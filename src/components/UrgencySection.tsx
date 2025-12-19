import { useEffect, useRef, useState } from "react";
import { Zap, Clock, Users, TrendingUp } from "lucide-react";

const urgencyPoints = [
  { icon: Zap, text: "Vendem rápido" },
  { icon: Users, text: "Criam fila de espera" },
  { icon: Clock, text: "Geram arrependimento em quem deixou para depois" },
];

const UrgencySection = () => {
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
    <section ref={sectionRef} className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container relative z-10">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="section-title mb-8">
            Esse Não Será Um <span className="text-primary">Lançamento Comum</span>
          </h2>
          
          <p className="text-lg text-foreground/80 mb-12">
            Este será um daqueles projetos que:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {urgencyPoints.map((point, index) => (
              <div
                key={point.text}
                className={`card-luxury transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${(index + 1) * 150}ms` }}
              >
                <point.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="font-medium text-foreground">{point.text}</p>
              </div>
            ))}
          </div>

          <div className={`space-y-6 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-2xl md:text-3xl font-serif font-semibold text-primary">
              Quem piscar, perde.
            </p>
            
            <p className="text-lg text-foreground/80">
              E quem entende de mercado imobiliário sabe:
            </p>
            
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-primary/10 border border-primary/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
              <p className="text-foreground font-medium">
                Os melhores lotes nunca chegam ao público geral.
              </p>
            </div>
            
            <p className="text-xl text-foreground/90 font-medium">
              Eles ficam com quem chega primeiro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UrgencySection;
