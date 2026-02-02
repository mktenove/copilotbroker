import logoEnove from "@/assets/logo-enove.png";

const MCFooter = () => {
  return (
    <footer className="py-16 md:py-20 bg-[hsl(var(--mc-forest))] text-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Impact Phrase */}
          <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl italic text-[hsl(var(--mc-sage-light))]">
            "O verdadeiro luxo começa pelo endereço."
          </blockquote>

          {/* Divider */}
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />

          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-white/60 uppercase tracking-wider">
              Comercialização
            </p>
            <img
              src={logoEnove}
              alt="Enove"
              className="h-10 w-auto brightness-0 invert opacity-80"
            />
          </div>

          {/* Disclaimer */}
          <div className="pt-8 border-t border-white/10">
            <p className="text-xs text-white/50 max-w-2xl mx-auto leading-relaxed">
              As imagens e informações contidas neste material são meramente ilustrativas, 
              podendo haver alterações sem aviso prévio. O projeto está sujeito a aprovação 
              dos órgãos competentes. Consulte o memorial descritivo e as condições comerciais.
            </p>
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Enove Imobiliária. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default MCFooter;
