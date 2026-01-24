import logoGoldenView from "@/assets/goldenview/logo-goldenview.png";
import logoEnove from "@/assets/logo-enove.png";

const GVFooter = () => {
  return (
    <footer className="py-12 bg-card border-t border-border/50">
      <div className="container px-4">
        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            <strong>Observação importante:</strong> O material apresentado é meramente ilustrativo e não representa o projeto oficial, que será divulgado exclusivamente aos cadastrados no momento oportuno.
          </p>
        </div>

        {/* Logos */}
        <div className="flex flex-col items-center gap-8 mb-8">
          {/* GoldenView Logo */}
          <img
            src={logoGoldenView}
            alt="GoldenView Residencial"
            className="h-16 w-auto"
          />

          {/* Partners Text */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Uma realização</p>
            <p className="font-serif text-lg font-semibold text-foreground">
              Construsinos + HabitaSinos + Maricler
            </p>
          </div>

          {/* Divider */}
          <div className="w-20 h-px bg-border" />

          {/* Enove */}
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
            © 2026 Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default GVFooter;
