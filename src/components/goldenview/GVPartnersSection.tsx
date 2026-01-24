import { useEffect, useRef, useState } from "react";
import { Building2, Award, ShieldCheck, Handshake } from "lucide-react";

const credentials = [
  {
    icon: Building2,
    title: "Obras Entregues",
    description: "Histórico sólido de empreendimentos concluídos na região"
  },
  {
    icon: Award,
    title: "Projetos Sólidos",
    description: "Qualidade reconhecida em cada detalhe construtivo"
  },
  {
    icon: ShieldCheck,
    title: "Credibilidade Regional",
    description: "Anos de confiança construída em Portão e região"
  },
  {
    icon: Handshake,
    title: "Parceria de Sucesso",
    description: "Duas gigantes unidas para um projeto único"
  }
];

const GVPartnersSection = () => {
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
      id="parceiros"
      ref={sectionRef}
      className="py-20 md:py-32 bg-background relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container px-4 relative z-10">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Title */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            NÃO É PROMESSA.{" "}
            <span className="text-gold-gradient">É HISTÓRICO DE ENTREGA.</span>
          </h2>

          {/* Description */}
          <p className="text-base sm:text-lg text-muted-foreground mb-4 leading-relaxed">
            A <strong className="text-foreground">CONSTRUSINOS</strong> e a <strong className="text-foreground">MARICLER</strong> não precisam convencer ninguém com discurso bonito.
          </p>
          
          <p className="text-base sm:text-lg text-muted-foreground mb-12 leading-relaxed">
            Elas constroem reputação com obras entregues, projetos sólidos e credibilidade construída ao longo dos anos em Portão e região.
          </p>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {credentials.map((item, index) => (
              <div
                key={item.title}
                className={`card-luxury p-6 text-center transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Emphasis */}
          <div className={`space-y-4 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <span className="text-primary">👉</span>
              Esse não é um projeto experimental.
            </p>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <span className="text-primary">👉</span>
              É um empreendimento feito por quem sabe exatamente o que está fazendo.
            </p>
            
            <div className="divider-gold mx-auto my-8" />
            
            <p className="font-serif text-xl md:text-2xl italic text-foreground">
              Por isso, este lançamento não vai depender de propaganda para vender.
            </p>
            <p className="font-serif text-xl md:text-2xl font-semibold text-primary">
              Ele vai vender porque o mercado confia.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GVPartnersSection;
