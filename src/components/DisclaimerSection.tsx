import { AlertCircle } from "lucide-react";

const DisclaimerSection = () => {
  return (
    <aside 
      className="py-8 sm:py-12 bg-secondary/50 border-t border-border/30"
      aria-label="Aviso legal"
    >
      <div className="container px-4">
        <div className="flex items-start gap-3 sm:gap-4 max-w-3xl mx-auto">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <strong className="font-semibold text-foreground/80">Observação importante:</strong>{" "}
            O masterplan apresentado é meramente ilustrativo e não representa o projeto oficial, 
            que será divulgado exclusivamente aos cadastrados no momento oportuno.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default DisclaimerSection;
