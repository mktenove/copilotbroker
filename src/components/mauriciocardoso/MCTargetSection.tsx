import { useEffect, useRef, useState } from "react";
import { Users, TrendingUp, Briefcase } from "lucide-react";

const profiles = [
  {
    icon: Users,
    title: "Para quem busca morar bem:",
    benefit: "Endereço nobre, segurança, privacidade e qualidade de vida para toda a família.",
    color: "from-blue-500/20 to-blue-600/20"
  },
  {
    icon: TrendingUp,
    title: "Para quem investe com visão:",
    benefit: "Localização premium, escassez de unidades e projeto sólido — a combinação clássica de valorização consistente.",
    color: "from-green-500/20 to-green-600/20"
  },
  {
    icon: Briefcase,
    title: "Para quem conquistou seu lugar:",
    benefit: "Status, exclusividade e um endereço que é referência em Novo Hamburgo.",
    color: "from-purple-500/20 to-purple-600/20"
  }
];

const MCTargetSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="perfil"
      ref={sectionRef}
      className="py-20 md:py-32 bg-background relative overflow-hidden"
    >
      <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

      <div className="container px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            ESSE NÃO É UM APARTAMENTO.{" "}
            <span className="text-gold-gradient">É UM PATRIMÔNIO.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {profiles.map((profile, index) => (
            <div
              key={profile.title}
              className={`relative group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="card-luxury h-full flex flex-col items-center text-center p-8">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${profile.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <profile.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-4 text-foreground">
                  {profile.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed flex-1 flex items-center">
                  <span className="text-primary mr-2">👉</span>
                  {profile.benefit}
                </p>
              </div>
              <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MCTargetSection;
