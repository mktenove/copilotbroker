import logoEnove from "@/assets/logo-enove.png";

const MCFooter = () => {
  return (
    <footer className="py-12 bg-card border-t border-border/50">
      <div className="container px-4">
        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            <strong>Observação importante:</strong> As imagens e informações contidas neste material são meramente ilustrativas,
            podendo haver alterações sem aviso prévio. O projeto está sujeito a aprovação
            dos órgãos competentes. Consulte o memorial descritivo e as condições comerciais.
          </p>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-8 mb-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Comercialização</p>
            <img
              src={logoEnove}
              alt="Enove Imobiliária"
              className="h-8 w-auto mx-auto"
            />
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Enove Imobiliária. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default MCFooter;
