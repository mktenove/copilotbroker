import { useEffect, useRef, useState } from "react";
import { Check, Crown } from "lucide-react";

const benefits = [
  "Prioridade no recebimento dos detalhes oficiais",
  "Maior velocidade no acesso ao espelho de vendas e tabela de preços",
  "Chance real de escolher os melhores lotes",
];

const BenefitsSection = () => {
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
      className="py-16 sm:py-20 md:py-32 bg-secondary/30 relative overflow-hidden"
      aria-labelledby="benefits-title"
    >
      <div className="container relative z-10 px-4">
        <div className={`max-w-4xl mx-auto ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <header className="text-center mb-8 sm:mb-12">
            <div 
              className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 mb-4 sm:mb-6 ${isVisible ? 'animate-rotate-in' : 'opacity-0'}`} 
              style={{ animationDelay: '200ms' }}
              aria-hidden="true"
            >
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 
              id="benefits-title"
              className={`section-title mb-4 text-2xl sm:text-3xl md:text-4xl ${isVisible ? 'animate-slide-up' : 'opacity-0'}`} 
              style={{ animationDelay: '300ms' }}
            >
              Acesso Antecipado <span className="text-primary">às Vendas</span>
            </h2>
            <p className={`section-subtitle text-sm sm:text-base ${isVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
              O cadastro abaixo não é apenas para receber informações.
            </p>
          </header>

          <div className={`card-luxury p-6 sm:p-8 md:p-12 mb-8 sm:mb-10 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '500ms' }}>
            <p className="text-base sm:text-lg text-foreground/90 font-medium mb-6 sm:mb-8 text-center">
              Ele garante:
            </p>
            
            <ul className="space-y-3 sm:space-y-4" role="list">
              {benefits.map((benefit, index) => (
                <li
                  key={benefit}
                  className={`flex items-start gap-3 sm:gap-4 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`}
                  style={{ animationDelay: `${(index + 3) * 150}ms` }}
                >
                  <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-sm sm:text-lg text-foreground/90">{benefit}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className={`text-center ${isVisible ? 'animate-blur' : 'opacity-0'}`} style={{ animationDelay: '1000ms' }}>
            <p className="text-sm sm:text-lg text-foreground/80 italic px-4">
              Sem cadastro, você será apenas mais um tentando comprar quando todo mundo já comprou.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
