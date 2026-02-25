import { useEffect, useRef, useState } from "react";
import rosenGartenLogo from "@/assets/rosen-garten-logo.png";
import logoEnove from "@/assets/logo-enove.png";

/* ─── Intersection Observer hook for scroll-triggered animations ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ─── Reusable section wrapper ─── */
const Section = ({ children, className = "", dark = false, id }: { children: React.ReactNode; className?: string; dark?: boolean; id?: string }) => (
  <section id={id} className={`py-10 md:py-14 lg:py-18 px-5 md:px-8 ${dark ? "bg-[#0a0a0a] text-white" : "bg-[#f5f0e8] text-[#1a1a1a]"} ${className}`}>
    <div className="max-w-5xl mx-auto">{children}</div>
  </section>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Reveal>
    <span className="inline-block text-[11px] md:text-xs font-semibold tracking-[0.3em] uppercase text-[#c9a84c] mb-4 md:mb-6">
      {children}
    </span>
  </Reveal>
);

const SectionTitle = ({ children, light = false }: { children: React.ReactNode; light?: boolean }) => (
  <Reveal delay={100}>
    <h2 className={`font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-6 md:mb-8 ${light ? "text-white" : "text-[#1a1a1a]"}`}>
      {children}
    </h2>
  </Reveal>
);

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#c9a84c]">{children}</span>
);

const Divider = () => (
  <div className="w-16 h-px bg-[#c9a84c]/40 my-5 md:my-8" />
);

const BulletList = ({ items, light = false }: { items: string[]; light?: boolean }) => (
  <ul className={`space-y-2.5 text-sm md:text-base leading-relaxed ${light ? "text-white/75" : "text-[#1a1a1a]/70"}`}>
    {items.map((item, i) => (
      <Reveal key={i} delay={i * 60}>
        <li className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-2 shrink-0" />
          {item}
        </li>
      </Reveal>
    ))}
  </ul>
);

const Quote = ({ children, light = false }: { children: React.ReactNode; light?: boolean }) => (
  <Reveal>
    <blockquote className={`border-l-2 border-[#c9a84c]/50 pl-5 md:pl-6 py-2 font-serif italic text-lg md:text-xl lg:text-2xl leading-relaxed ${light ? "text-white/80" : "text-[#1a1a1a]/80"}`}>
      {children}
    </blockquote>
  </Reveal>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <Reveal>
    <div className="text-center">
      <div className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[#c9a84c] mb-2">{value}</div>
      <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">{label}</div>
    </div>
  </Reveal>
);

/* ─── Main Page ─── */
const BairrodasRosas = () => {
  useEffect(() => {
    document.title = "Enove + Rosen Garten | Parceria Estratégica";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans antialiased selection:bg-[#c9a84c]/30 selection:text-white">
      
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 text-center bg-[#0a0a0a] overflow-hidden">
        {/* Subtle grain */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]" />
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-8 animate-[fadeIn_1.2s_ease-out]">
          <img src={logoEnove} alt="Enove" className="h-8 md:h-10 mx-auto opacity-70" />
          
          <div className="space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
              Enove Imobiliária<br />
              <span className="text-[#c9a84c]">+ Enove Select</span>
            </h1>
            <p className="text-sm md:text-base text-white/50 tracking-[0.2em] uppercase">
              O parceiro estratégico para lançamentos imobiliários no RS
            </p>
          </div>
          
          <div className="w-12 h-px bg-[#c9a84c]/50 mx-auto" />
          
          <p className="text-base md:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Transformamos lançamentos em cases de sucesso através de estratégia, tecnologia e alta performance comercial.
          </p>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-[#c9a84c]/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ═══════════ POSICIONAMENTO ═══════════ */}
      <Section dark>
        <SectionLabel>Posicionamento</SectionLabel>
        <SectionTitle light>
          Lançamentos exigem <Highlight>método</Highlight>.<br />Não improviso.
        </SectionTitle>
        <Reveal delay={200}>
          <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-2xl">
            Lançar um empreendimento não é abrir vendas.<br />
            É construir posicionamento, gerar demanda qualificada e executar uma operação comercial estruturada.
          </p>
        </Reveal>
        <Divider />
        <Reveal delay={300}>
          <p className="text-[#c9a84c] font-serif italic text-lg md:text-xl">
            A Enove nasceu com esse foco.
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ QUEM SOMOS ═══════════ */}
      <Section>
        <SectionLabel>Quem Somos</SectionLabel>
        <SectionTitle>
          <Highlight>12 anos</Highlight> de atuação em Estância Velha
        </SectionTitle>
        <Reveal delay={150}>
          <p className="text-[#1a1a1a]/70 text-base md:text-lg leading-relaxed mb-8 max-w-3xl">
            O setor de lançamentos nasceu de um projeto embrionário com o <strong>Horizon Clube Residencial</strong>, 
            pelo qual a Enove recebeu premiação pelo desempenho do lançamento. A partir disso, lançamos 
            empreendimentos lado a lado com incorporadoras desde:
          </p>
        </Reveal>
        <BulletList items={[
          "Concepção do produto",
          "Estruturação estratégica",
          "Geração de demanda",
          "Execução comercial",
          "Venda da última unidade",
        ]} />
        <Divider />
        <Quote>Nosso objetivo é simples: maximizar velocidade de vendas e valorização do produto.</Quote>
      </Section>

      {/* ═══════════ O QUE ENTREGAMOS ═══════════ */}
      <Section dark>
        <SectionLabel>O Que Entregamos</SectionLabel>
        <SectionTitle light>
          Operação <Highlight>completa</Highlight> de lançamentos
        </SectionTitle>
        <Reveal delay={150}>
          <p className="text-white/60 text-base md:text-lg mb-8">
            Não somos apenas intermediadores.<br />
            Somos uma estrutura completa de lançamento:
          </p>
        </Reveal>
        <BulletList light items={[
          "Planejamento estratégico",
          "Estrutura de marketing própria",
          "Gestão comercial especializada",
          "Operação orientada por dados",
          "Segurança jurídica e LGPD",
        ]} />
        <Divider />
        <Reveal delay={300}>
          <p className="text-[#c9a84c] font-serif italic text-lg">
            Marketing e vendas integrados desde o primeiro dia.
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ MARKETING ═══════════ */}
      <Section>
        <SectionLabel>Equipe de Marketing Própria</SectionLabel>
        <SectionTitle>
          Planejamento, criação e <Highlight>execução</Highlight>
        </SectionTitle>
        <BulletList items={[
          "Posicionamento e naming",
          "Branding e storytelling",
          "Estratégia de mídia e tráfego pago",
          "Landing pages e funis",
          "Automação e nutrição de leads",
          "Campanhas de conversão",
        ]} />
        <Divider />
        <Quote>Tudo interno. Sem dependência de terceiros.</Quote>
      </Section>

      {/* ═══════════ CORRETORES ═══════════ */}
      <Section dark>
        <SectionLabel>Corretores de Alta Performance</SectionLabel>
        <SectionTitle light>
          Especialistas em <Highlight>lançamentos</Highlight>
        </SectionTitle>
        <BulletList light items={[
          "Processo comercial estruturado",
          "Scripts e playbooks próprios",
          "Gestão ativa de leads",
          "Métricas de conversão monitoradas",
          "Cultura de metas e performance",
        ]} />
        <Divider />
        <Reveal>
          <p className="text-[#c9a84c] font-serif italic text-lg">
            Cada lead é tratado como uma oportunidade real.
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ TECNOLOGIA ═══════════ */}
      <Section>
        <SectionLabel>Tecnologia e Dados</SectionLabel>
        <SectionTitle>
          Operação orientada por <Highlight>dados</Highlight>
        </SectionTitle>
        <BulletList items={[
          "CRM exclusivo para lançamentos",
          "Distribuição inteligente de leads",
          "Monitoramento de tempo de resposta",
          "Acompanhamento de taxa de conversão",
          "Funil comercial rastreável",
        ]} />
        <Divider />
        <Quote>Decisão baseada em número, não em opinião.</Quote>
      </Section>

      {/* ═══════════ LGPD ═══════════ */}
      <Section dark>
        <SectionLabel>LGPD e Segurança</SectionLabel>
        <SectionTitle light>
          Primeira imobiliária do RS completamente adaptada à <Highlight>LGPD</Highlight>
        </SectionTitle>
        <BulletList light items={[
          "Processos auditáveis",
          "Tratamento legal de dados",
          "Proteção da incorporadora",
          "Segurança jurídica",
        ]} />
        <Divider />
        <Reveal>
          <p className="text-white/60 text-base md:text-lg">
            Parceiros precisam de segurança.<br />
            <span className="text-[#c9a84c] font-semibold">Nós entregamos.</span>
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ CICLO COMPLETO ═══════════ */}
      <Section>
        <SectionLabel>Modelo de Atuação</SectionLabel>
        <SectionTitle>
          Ciclo <Highlight>completo</Highlight> do lançamento
        </SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mt-12">
          {/* Pré-lançamento */}
          <Reveal delay={0}>
            <div className="border border-[#1a1a1a]/10 rounded-lg p-6 md:p-8 hover:border-[#c9a84c]/40 transition-colors group">
              <div className="text-[#c9a84c] font-serif text-4xl md:text-5xl font-semibold mb-3 group-hover:scale-105 transition-transform">01</div>
              <h3 className="font-serif text-xl md:text-2xl font-semibold mb-2">Pré-lançamento</h3>
              <p className="text-xs uppercase tracking-wider text-[#1a1a1a]/40 mb-4">Construção da base de demanda</p>
              <ul className="space-y-2 text-sm text-[#1a1a1a]/65">
                <li>• Estratégia comercial</li>
                <li>• Jornada do cliente</li>
                <li>• Captação de leads</li>
                <li>• Lista qualificada</li>
                <li>• Testes de preço e aceitação</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#1a1a1a]/10">
                <p className="font-serif italic text-sm text-[#c9a84c]">Antes de vender, construímos mercado.</p>
              </div>
            </div>
          </Reveal>

          {/* Lançamento */}
          <Reveal delay={150}>
            <div className="border border-[#c9a84c]/30 rounded-lg p-6 md:p-8 bg-[#c9a84c]/5 hover:border-[#c9a84c]/60 transition-colors group">
              <div className="text-[#c9a84c] font-serif text-4xl md:text-5xl font-semibold mb-3 group-hover:scale-105 transition-transform">02</div>
              <h3 className="font-serif text-xl md:text-2xl font-semibold mb-2">Lançamento</h3>
              <p className="text-xs uppercase tracking-wider text-[#1a1a1a]/40 mb-4">Execução coordenada</p>
              <ul className="space-y-2 text-sm text-[#1a1a1a]/65">
                <li>• Gestão de plantões</li>
                <li>• Acompanhamento em tempo real</li>
                <li>• Conversão intensiva</li>
                <li>• Estratégia de escassez</li>
                <li>• Propostas de intenção estruturadas</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#c9a84c]/20">
                <p className="font-serif italic text-sm text-[#c9a84c]">Velocidade é percepção de valor.</p>
              </div>
            </div>
          </Reveal>

          {/* Pós-lançamento */}
          <Reveal delay={300}>
            <div className="border border-[#1a1a1a]/10 rounded-lg p-6 md:p-8 hover:border-[#c9a84c]/40 transition-colors group">
              <div className="text-[#c9a84c] font-serif text-4xl md:text-5xl font-semibold mb-3 group-hover:scale-105 transition-transform">03</div>
              <h3 className="font-serif text-xl md:text-2xl font-semibold mb-2">Pós-lançamento</h3>
              <p className="text-xs uppercase tracking-wider text-[#1a1a1a]/40 mb-4">Até a última unidade</p>
              <ul className="space-y-2 text-sm text-[#1a1a1a]/65">
                <li>• Gestão de estoque</li>
                <li>• Campanhas específicas</li>
                <li>• Estratégia de giro</li>
                <li>• Relacionamento contínuo</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#1a1a1a]/10">
                <p className="font-serif italic text-sm text-[#c9a84c]">Nosso compromisso não termina no evento de lançamento.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ═══════════ CONTEXTO ESTRATÉGICO ═══════════ */}
      <Section dark>
        <SectionLabel>Contexto Estratégico do Projeto</SectionLabel>
        <SectionTitle light>
          <Highlight>Rosen Garten</Highlight> — O empreendimento
        </SectionTitle>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 my-12 md:my-16">
          <Stat value="350" label="Lotes" />
          <Stat value="8.000m²" label="Área de Lazer" />
          <Stat value="R$ 1.300" label="Por m²" />
          <Stat value="500m²" label="Lotes a partir de" />
        </div>

        <Reveal>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8 space-y-2">
            <p className="text-white/50 text-sm uppercase tracking-wider">Localização</p>
            <p className="text-white text-lg md:text-xl font-serif">Estância Velha — Bairro das Rosas</p>
            <p className="text-white/50 text-sm uppercase tracking-wider mt-4">Público Alvo</p>
            <p className="text-white text-lg md:text-xl font-serif">Primeiro investimento de alto padrão</p>
          </div>
        </Reveal>
        
        <Divider />
        <Quote light>
          Este não é apenas um lançamento.<br />É um projeto de reposicionamento urbano.
        </Quote>
      </Section>

      {/* ═══════════ DESAFIO REAL ═══════════ */}
      <Section>
        <SectionLabel>O Desafio Real</SectionLabel>
        <SectionTitle>
          O Bairro das Rosas hoje possui percepção de padrão <Highlight>médio-baixo</Highlight>
        </SectionTitle>
        <Reveal delay={150}>
          <div className="space-y-4 text-base md:text-lg text-[#1a1a1a]/70 leading-relaxed max-w-3xl">
            <p>Isso não é um problema.<br /><strong className="text-[#c9a84c]">É uma oportunidade.</strong></p>
            <p>Grandes empreendimentos não nascem em bairros consolidados.<br />
            <strong>Eles consolidam bairros.</strong></p>
          </div>
        </Reveal>
        <Divider />
        <SectionLabel>Nosso Papel</SectionLabel>
        <BulletList items={[
          "Criar uma nova narrativa",
          "Elevar a percepção de valor",
          "Construir uma nova identidade para a região",
        ]} />
      </Section>

      {/* ═══════════ REPOSICIONAMENTO ═══════════ */}
      <Section dark>
        <SectionLabel>Estratégia de Reposicionamento</SectionLabel>
        <SectionTitle light>
          Transformar "Bairro das Rosas" em <Highlight>destino aspiracional</Highlight>
        </SectionTitle>
        <BulletList light items={[
          "Naming sofisticado",
          "Storytelling forte sobre herança alemã",
          "Arquitetura e paisagismo como marca registrada",
          "Comunicação visual superior à média da cidade",
          'Posicionamento de "novo eixo de crescimento"',
        ]} />
        <Divider />
        <Reveal>
          <div className="bg-white/5 border border-[#c9a84c]/20 rounded-lg p-6 md:p-8 space-y-3">
            <p className="text-xs uppercase tracking-wider text-[#c9a84c]">Narrativa Central</p>
            <p className="font-serif text-xl md:text-2xl text-white/90 italic leading-relaxed">
              O bairro não é o que foi.<br />
              É o que está prestes a se tornar.
            </p>
            <p className="text-white/50 text-sm mt-4">Quem compra primeiro participa da valorização.</p>
          </div>
        </Reveal>
      </Section>

      {/* ═══════════ ANÁLISE COMPETITIVA ═══════════ */}
      <Section>
        <SectionLabel>Análise Competitiva</SectionLabel>
        <SectionTitle>
          Cenário atual em <Highlight>Estância Velha</Highlight>
        </SectionTitle>
        
        <Reveal delay={150}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[500px] text-sm md:text-base mt-8">
              <thead>
                <tr className="border-b-2 border-[#c9a84c]/30">
                  <th className="text-left pb-3 font-semibold text-[#1a1a1a]">Empreendimento</th>
                  <th className="text-left pb-3 font-semibold text-[#1a1a1a]">Ticket</th>
                  <th className="text-left pb-3 font-semibold text-[#1a1a1a]">Condição</th>
                  <th className="text-left pb-3 font-semibold text-[#1a1a1a]">Público</th>
                </tr>
              </thead>
              <tbody className="text-[#1a1a1a]/70">
                <tr className="border-b border-[#1a1a1a]/10">
                  <td className="py-3 font-medium">Mont Serrat</td>
                  <td className="py-3">~R$ 1.400/m²</td>
                  <td className="py-3 text-sm">10% + 84x s/ juros</td>
                  <td className="py-3">Médio-alto</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]/10">
                  <td className="py-3 font-medium">Horizon</td>
                  <td className="py-3">~R$ 1.800/m²</td>
                  <td className="py-3 text-sm">10% + 60x s/ juros</td>
                  <td className="py-3">Médio-alto</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]/10">
                  <td className="py-3 font-medium">Ábaco (futuro)</td>
                  <td className="py-3">~R$ 1.600/m²</td>
                  <td className="py-3 text-sm">30% + 60x s/ juros + IPCA</td>
                  <td className="py-3">Alto padrão</td>
                </tr>
                <tr className="border-b-2 border-[#c9a84c]/30 bg-[#c9a84c]/5">
                  <td className="py-3 font-bold text-[#c9a84c]">Rosen Garten</td>
                  <td className="py-3 font-bold text-[#c9a84c]">R$ 1.300/m²</td>
                  <td className="py-3 text-sm font-semibold text-[#c9a84c]">Estratégia otimizada</td>
                  <td className="py-3 font-semibold text-[#c9a84c]">Seu 1º alto padrão</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      {/* ═══════════ TICKET MÉDIO ═══════════ */}
      <Section dark>
        <SectionLabel>Estudo de Ticket Médio</SectionLabel>
        <SectionTitle light>
          Estratégia de <Highlight>fluxo de pagamento</Highlight>
        </SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
          <Reveal>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Ticket</p>
              <p className="text-[#c9a84c] font-serif text-2xl md:text-3xl font-semibold">R$ 1.300/m²</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Padrão</p>
              <p className="text-white font-serif text-lg">Alto padrão</p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Lazer</p>
              <p className="text-white font-serif text-lg">8.000m² estruturado</p>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-lg p-6 md:p-8 space-y-4 my-10">
            <p className="text-[#c9a84c] text-xs uppercase tracking-wider font-semibold">Nossa Sugestão</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div>
                <p className="text-white font-serif text-3xl md:text-4xl font-semibold">15%</p>
                <p className="text-white/50 text-sm">de entrada</p>
              </div>
              <div>
                <p className="text-white font-serif text-3xl md:text-4xl font-semibold">84x</p>
                <p className="text-white/50 text-sm">sem juros, com IPCA ou INCC anual</p>
              </div>
            </div>
          </div>
        </Reveal>

        <BulletList light items={[
          "Embutir custo financeiro na precificação",
          "Aumentar acessibilidade psicológica",
          "Maximizar base de compradores",
          "Acelerar velocidade de vendas",
        ]} />
        
        <Divider />
        <Quote light>
          Parcelamento sem juros é argumento decisivo.
        </Quote>
        <Reveal delay={200}>
          <p className="text-white/50 text-sm mt-4 leading-relaxed">
            Especialmente porque o bairro ainda precisa de aceitação de mercado.<br />
            Facilidade financeira reduz objeção inicial.
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ POR QUE NÃO 30%? ═══════════ */}
      <Section>
        <SectionLabel>Análise Estratégica</SectionLabel>
        <SectionTitle>
          Por que <Highlight>não</Highlight> 30% de entrada?
        </SectionTitle>
        <BulletList items={[
          "Público alvo é de primeiro imóvel de alto padrão",
          "Região ainda precisa consolidação",
          "Demanda precisa ser estimulada",
        ]} />
        <Divider />
        <Quote>Entrada menor amplia público.</Quote>
      </Section>

      {/* ═══════════ CONCEITO DO EMPREENDIMENTO ═══════════ */}
      <Section dark>
        <SectionLabel>Estudo Preliminar</SectionLabel>
        <Reveal>
          <p className="text-white/30 text-xs uppercase tracking-wider mb-8">
            OBS: Este é um estudo preliminar, e deverá ser reestruturado e enriquecido.
          </p>
        </Reveal>
        <SectionTitle light>
          Antes de vender lotes, vendemos um <Highlight>estilo de vida</Highlight>
        </SectionTitle>
        <Reveal delay={200}>
          <p className="text-white/60 text-base md:text-lg">
            O produto precisa ter diferenciais reais, percebidos e exploráveis comercialmente.
          </p>
        </Reveal>
      </Section>

      {/* ═══════════ PROPOSTAS ESTRATÉGICAS ═══════════ */}
      <Section>
        <SectionLabel>Propostas Estratégicas</SectionLabel>
        <SectionTitle>
          Estruturas âncoras de <Highlight>valor</Highlight>
        </SectionTitle>

        {/* Conceito germânico */}
        <Reveal>
          <div className="border border-[#1a1a1a]/10 rounded-lg p-6 md:p-8 mb-6">
            <h3 className="font-serif text-xl md:text-2xl font-semibold mb-3 text-[#c9a84c]">Conceito Germânico</h3>
            <p className="text-[#1a1a1a]/70 text-sm md:text-base leading-relaxed">
              Em toda implantação, desde o projeto de cada quiosque, salão de festas até os postes e luminárias. 
              Trazer elementos, arquitetura colonial e enxaimel na infraestrutura. 
              Paisagismo com elementos coloniais e germânicos, plátanos e outras espécies típicas.
            </p>
          </div>
        </Reveal>

        {/* Infraestrutura grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {[
            { title: "Mirante com Chimarródromo", items: ["Ponto instagramável", "Local de convivência", "Conexão cultural regional"] },
            { title: "Casa da Árvore", items: ["Diferencial emocional para crianças", "Apelo familiar", "Fortíssimo para storytelling"] },
            { title: "Poço Artesiano", items: ["Segurança hídrica", "Mitiga dependência da Corsan", "Argumento de valorização"] },
            { title: "Piscina Térmica Indoor", items: ["Bomba de calor", "Usina fotovoltaica para compensação", "Baixa taxa condominial"] },
            { title: "Piscina Externa", items: ["Prainha e partes rasas", "Aquaplay e Splash Pad", "Sofisticação ao empreendimento"] },
            { title: "Academia", items: ["Equipamentos modernos", "Espaço de bem-estar", "Diferencial competitivo"] },
          ].map((card, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="border border-[#1a1a1a]/10 rounded-lg p-5 md:p-6 hover:border-[#c9a84c]/30 transition-colors h-full">
                <h4 className="font-serif text-lg font-semibold mb-3">{card.title}</h4>
                <ul className="space-y-1.5 text-sm text-[#1a1a1a]/60">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#c9a84c] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ═══════════ HUB SOCIAL ═══════════ */}
      <Section dark>
        <SectionLabel>Hub Social</SectionLabel>
        <SectionTitle light>
          Espaço de <Highlight>convivência</Highlight> e esporte
        </SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
          <Reveal>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h4 className="font-serif text-lg font-semibold text-white mb-3">3 Quadras Híbridas de Areia</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Beach tennis, Futevôlei, Vôlei</li>
                <li>• Área: 16x8m (jogo) / 22x14m (com recuo)</li>
                <li>• Postes reguláveis, múltiplos pontos de fixação</li>
              </ul>
              <p className="text-white/40 text-sm mt-4">
                Entre quadras: 2 quiosques fechados de 35m² — Arquitetura enxaimel
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h4 className="font-serif text-lg font-semibold text-white mb-3">Complementos</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Quadra poliesportiva</li>
                <li>• Quadra de padel</li>
                <li>• Quadra de tênis</li>
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="bg-white/5 border border-[#c9a84c]/20 rounded-lg p-6 md:p-8">
            <h4 className="font-serif text-lg font-semibold text-[#c9a84c] mb-3">Salão de Festas</h4>
            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-3">
              Posicionamento estratégico próximo à portaria — Arquitetura enxaimel.
            </p>
            <BulletList light items={[
              "Reduz ruídos internos",
              "Reduz circulação desnecessária",
              "Resolve problemas já enfrentados em empreendimentos da cidade",
            ]} />
            <p className="text-white/50 text-sm mt-4">
              150m² divisível em 2 salões de 75m² — eventos de 60 ou 2x30 pessoas.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ═══════════ NAMING — ROSEN GARTEN ═══════════ */}
      <Section className="!py-0">
        <div className="py-12">
          <SectionLabel>Naming</SectionLabel>
          <SectionTitle>
            Aqui entra <Highlight>sofisticação</Highlight>
          </SectionTitle>
        </div>
      </Section>

      {/* Full-screen logo slide */}
      <section className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]" />
        <Reveal>
          <img 
            src={rosenGartenLogo} 
            alt="Rosen Garten" 
            className="w-full max-w-2xl md:max-w-4xl px-6 mx-auto drop-shadow-2xl"
          />
        </Reveal>
      </section>

      {/* Naming explanation */}
      <Section>
        <SectionLabel>Opção 1 — Rosen Garten</SectionLabel>
        <SectionTitle>
          Um nome que funciona em <Highlight>múltiplos níveis</Highlight>
        </SectionTitle>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 my-10">
          {[
            { title: "Autenticidade Local", desc: "O Bairro das Rosas é a raiz geográfica e histórica. Uma declaração de pertencimento e respeito à comunidade." },
            { title: "Sonoridade Sofisticada", desc: "\"Rosen\" (Rosas) + \"Garten\" (Jardim) — assinatura linguística única, elegante e conectada às origens germânicas." },
            { title: "Simbologia Profunda", desc: "A rosa: beleza, amor, perfeição e luxo. O jardim: cultivo, harmonia, refúgio e bem-estar." },
            { title: "Herança Cultural", desc: "Homenageia a tradição alemã da região, mantendo conexão com a história local sem parecer arcaico." },
          ].map((card, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="border border-[#1a1a1a]/10 rounded-lg p-5 md:p-6 h-full">
                <h4 className="font-serif text-lg font-semibold text-[#c9a84c] mb-2">{card.title}</h4>
                <p className="text-sm text-[#1a1a1a]/65 leading-relaxed">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Conceito Rosen Garten */}
      <Section dark>
        <SectionLabel>O Conceito</SectionLabel>
        <Reveal>
          <div className="max-w-3xl mx-auto">
            <p className="font-serif text-base md:text-lg lg:text-xl text-white/75 leading-relaxed space-y-4">
              <span className="block mb-4">
                Existe um lugar em Estância Velha onde natureza e propósito se encontram em perfeita harmonia. 
                Um lugar que herdou o nome de um bairro que floresce há gerações: o Bairro das Rosas.
              </span>
              <span className="block mb-4">
                Mas <span className="text-[#c9a84c]">Rosen Garten</span> não é apenas um nome; é um convite a viver em um jardim cultivado 
                para a excelência. Assim como uma rosa é a síntese de beleza, fragrância e espinhos que a protegem, 
                Rosen Garten é a síntese de um estilo de vida.
              </span>
              <span className="block mb-4">
                Aqui, cada dia é um cultivo intencional de bem-estar. O jardim não é apenas uma metáfora; é uma 
                realidade. É o espaço onde você cultiva suas ambições, nutre sua família, e floresce em sua forma 
                mais plena.
              </span>
              <span className="block mb-4">
                Rosen Garten é onde a tradição alemã de precisão e qualidade encontra a visão contemporânea de 
                bem-estar integral. É o lugar onde você não apenas vive, mas cultiva uma vida extraordinária.
              </span>
              <span className="block mb-4">
                Cada lote é um canteiro de possibilidades.<br />
                Cada manhã, uma oportunidade de ver suas rosas florescerem.
              </span>
            </p>
            <Divider />
            <p className="font-serif text-xl md:text-2xl lg:text-3xl text-[#c9a84c] italic text-center">
              Rosen Garten. Cultive sua vida extraordinária.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* Visão estratégica */}
      <Section>
        <SectionLabel>Visão Estratégica</SectionLabel>
        <SectionTitle>
          O nome não é detalhe
        </SectionTitle>
        <Quote>É o primeiro gatilho de percepção de valor.</Quote>
      </Section>

      {/* ═══════════ MODELO DE EXCLUSIVIDADE ═══════════ */}
      <Section dark>
        <SectionLabel>Modelo de Exclusividade</SectionLabel>
        <Reveal>
          <p className="text-white/30 text-xs uppercase tracking-wider mb-6">
            Opcional, mas recomendada
          </p>
        </Reveal>
        <SectionTitle light>
          Proposta de atuação <Highlight>exclusiva</Highlight>
        </SectionTitle>

        <Reveal delay={150}>
          <p className="text-white/60 text-base md:text-lg mb-8">Para garantir:</p>
        </Reveal>
        <BulletList light items={[
          "Controle de narrativa",
          "Uniformidade de posicionamento",
          "Padronização comercial",
          "Gestão de leads estruturada",
          "Velocidade de vendas",
        ]} />

        <Divider />

        <Reveal>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-6">Oferecemos</p>
        </Reveal>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          {[
            { title: "Marketing", items: ["Posicionamento e naming", "Branding e storytelling", "Estratégia de mídia e tráfego pago", "Landing pages e funis", "Automação e nutrição de leads", "Campanhas de conversão"] },
            { title: "Comercial", items: ["Processo comercial estruturado", "Scripts e playbooks próprios", "Gestão ativa de leads", "Métricas de conversão monitoradas", "Cultura de metas e performance"] },
            { title: "Tecnologia", items: ["CRM exclusivo para lançamentos", "Distribuição inteligente de leads", "Monitoramento de tempo de resposta", "Acompanhamento de taxa de conversão", "Funil comercial rastreável"] },
            { title: "Segurança", items: ["Processos auditáveis", "Tratamento legal de dados", "Proteção da incorporadora", "Segurança jurídica"] },
            { title: "Pré-lançamento", items: ["Estratégia comercial", "Jornada do cliente", "Captação de leads", "Lista qualificada", "Testes de preço e aceitação"] },
            { title: "Lançamento", items: ["Gestão de plantões", "Acompanhamento em tempo real", "Conversão intensiva", "Estratégia de escassez", "Propostas de intenção estruturadas"] },
            { title: "Pós-lançamento", items: ["Gestão de estoque", "Campanhas específicas", "Estratégia de giro", "Relacionamento contínuo"] },
            { title: "Produção", items: ["Elaboração completa da renderização 3D", "Imagens e vídeos profissionais"] },
          ].map((card, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5 h-full hover:border-[#c9a84c]/30 transition-colors">
                <h4 className="text-[#c9a84c] font-semibold text-sm uppercase tracking-wider mb-3">{card.title}</h4>
                <ul className="space-y-1.5 text-sm text-white/55">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#c9a84c]/60 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Divider />
        <Reveal>
          <div className="text-center space-y-2 my-8">
            <p className="text-white/40 text-sm">Lançamento pulverizado dilui percepção de valor.</p>
            <p className="text-[#c9a84c] font-serif text-lg md:text-xl font-semibold">
              Lançamento estruturado concentra resultado.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center px-5 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]" />
        
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <Reveal>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight mb-8">
              Vamos <span className="text-[#c9a84c]">lançar</span> juntos?
            </h2>
          </Reveal>
          
          <Reveal delay={200}>
            <p className="text-white/50 text-base md:text-lg mb-8">
              Se vocês buscam um parceiro preparado para:
            </p>
          </Reveal>
          
          <Reveal delay={300}>
            <ul className="space-y-3 text-left max-w-md mx-auto mb-12">
              {[
                "Criar valor onde o mercado ainda não enxerga",
                "Reposicionar um bairro",
                "Maximizar velocidade de vendas",
                "Conduzir o processo com segurança jurídica",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 text-sm md:text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          
          <Reveal delay={500}>
            <p className="font-serif text-2xl md:text-3xl text-[#c9a84c] font-semibold">
              Estamos prontos.
            </p>
          </Reveal>
          
          <Reveal delay={600}>
            <div className="mt-12 flex items-center justify-center gap-4 opacity-50">
              <img src={logoEnove} alt="Enove" className="h-6 md:h-8" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="bg-[#050505] border-t border-white/5 py-8 px-5 text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} Enove Imobiliária. Documento confidencial.
        </p>
      </footer>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BairrodasRosas;
