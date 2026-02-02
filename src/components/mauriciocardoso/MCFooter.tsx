import logoEnove from "@/assets/logo-enove.png";

const MCFooter = () => {
  return (
    <footer className="py-20 md:py-28 bg-[hsl(var(--mc-charcoal))] text-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          {/* Impact Quote - Large serif */}
          <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl italic text-white/80 leading-relaxed">
            "O verdadeiro luxo começa pelo endereço."
          </blockquote>

          {/* Divider */}
          <div className="w-16 h-px bg-white/20 mx-auto" />

          {/* Logo - Monocolor white */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
              Comercialização
            </p>
            <img
              src={logoEnove}
              alt="Enove"
              className="h-8 w-auto brightness-0 invert opacity-70"
            />
          </div>

          {/* Disclaimer */}
          <div className="pt-8">
            <p className="text-[10px] text-white/30 max-w-xl mx-auto leading-relaxed">
              As imagens e informações contidas neste material são meramente ilustrativas, 
              podendo haver alterações sem aviso prévio. O projeto está sujeito a aprovação 
              dos órgãos competentes. Consulte o memorial descritivo e as condições comerciais.
            </p>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-white/20">
            © {new Date().getFullYear()} Enove Imobiliária. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default MCFooter;
