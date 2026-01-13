import { useEffect, useRef, useState } from "react";
import { Zap, Clock, Users, TrendingUp } from "lucide-react";

const urgencyPoints = [
  { icon: Zap, text: "Vendem rápido" },
  { icon: Users, text: "Criam fila de espera" },
  { icon: Clock, text: "Geram arrependimento em quem deixou para depois" },
];

const UrgencySection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="py-16 sm:py-20 md:py-32 bg-background relative overflow-hidden"
      aria-labelledby="urgency-title"
    >
      {/* Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" aria-hidden="true" />
      
      <div className="container relative z-10 px-4">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 id="urgency-title" className="section-title mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-4xl">
            Esse Não Será Um <span className="text-primary">Lançamento Comum</span>
          </h2>
          
          <p className="text-base sm:text-lg text-foreground/80 mb-8 sm:mb-12">
            Este será um daqueles projetos que:
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12" role="list">
            {urgencyPoints.map((point, index) => (
              <li
                key={point.text}
                className={`card-luxury transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${(index + 1) * 150}ms` }}
              >
                <point.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-3 sm:mb-4" aria-hidden="true" />
                <p className="text-sm sm:text-base font-medium text-foreground">{point.text}</p>
              </li>
            ))}
          </ul>

          <div className={`space-y-4 sm:space-y-6 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-xl sm:text-2xl md:text-3xl font-serif font-semibold text-primary">
              Quem piscar, perde.
            </p>
            
            <p className="text-base sm:text-lg text-foreground/80">
              E quem entende de mercado imobiliário sabe:
            </p>
            
            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-primary/10 border border-primary/30 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" aria-hidden="true" />
              <p className="text-sm sm:text-base text-foreground font-medium text-left">
                Os melhores lotes nunca chegam ao público geral.
              </p>
            </div>
            
            <p className="text-lg sm:text-xl text-foreground/90 font-medium">
              Eles ficam com quem chega primeiro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UrgencySection;
