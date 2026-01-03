import { useEffect, useRef, useState } from "react";
import { Mountain, Leaf, Shield, Star, Building } from "lucide-react";
import aerialView from "@/assets/aerial-view.png";

const features = [
  { icon: Building, label: "Modernidade" },
  { icon: Leaf, label: "Natureza" },
  { icon: Shield, label: "Privacidade" },
  { icon: Star, label: "Qualidade de vida" },
  { icon: Mountain, label: "Alto padrão construtivo" },
];

const AboutSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.05 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="sobre" ref={sectionRef} className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container relative z-10">
        {/* Intro Text */}
        <div className={`max-w-4xl mx-auto text-center mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Em breve, a cidade de Estância Velha vai receber o condomínio fechado de terrenos mais aguardado da região.
            Um projeto assinado pela <span className="text-primary font-semibold">Ábaco</span>, a incorporadora responsável pelo Horizon Clube Residencial — referência absoluta em condomínios de alto padrão.
          </p>
          
          <div className={`divider-gold mx-auto mb-8 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '200ms' }} />
          
          <p className={`text-lg text-foreground/80 italic font-serif ${isVisible ? 'animate-blur' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
            Ainda não revelamos tudo. E isso é proposital.
          </p>
          <p className={`text-muted-foreground mt-2 ${isVisible ? 'animate-blur' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
            Porque alguns lugares não precisam ser explicados. Eles precisam ser vividos.
          </p>
        </div>

        {/* Main Section Title */}
        <div className={`text-center mb-16 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
          <h2 className="section-title mb-4">
            Um Novo Jeito de Morar.{" "}
            <span className="text-primary">No Ponto Mais Alto da Cidade.</span>
          </h2>
        </div>

        {/* Description */}
        <div className={`max-w-3xl mx-auto text-center mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
          <p className="text-lg text-foreground/90 leading-relaxed mb-6">
            Imagine viver no topo do morro, no Bairro Floresta. Onde a paisagem se abre. Onde o horizonte é mais amplo. Onde o silêncio, o verde e a vista criam uma conexão rara entre o ser humano e a imensidão da terra.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Um endereço pensado para quem quer se afastar da loucura dos grandes centros, sem abrir mão da mobilidade, do acesso rápido e da conveniência urbana.
          </p>
        </div>

        {/* Aerial View Image */}
        <div className={`relative mb-16 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '500ms' }}>
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border/30 hover:shadow-[0_0_60px_hsl(var(--primary)/0.15)] transition-shadow duration-700">
            <img 
              src={aerialView} 
              alt="Vista aérea do condomínio mostrando a distribuição completa do empreendimento" 
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4 italic">
            *Imagem meramente ilustrativa
          </p>
        </div>

        {/* CTA Button */}
        <div className={`text-center mb-20 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '700ms' }}>
          <button onClick={scrollToForm} className="btn-primary">
            Quero Acesso Antecipado
          </button>
        </div>

        {/* Features Grid */}
        <div className={`${isVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '800ms' }}>
          <p className="text-center text-foreground/80 mb-10">
            Aqui, cada detalhe nasce do equilíbrio perfeito entre:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.label}
                className={`card-luxury text-center group ${isVisible ? 'animate-rotate-in' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 100 + 900}ms` }}
              >
                <feature.icon className="w-8 h-8 text-primary mx-auto mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                <p className="text-sm font-medium text-foreground">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
