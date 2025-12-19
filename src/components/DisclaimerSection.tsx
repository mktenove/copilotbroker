import { AlertCircle } from "lucide-react";

const DisclaimerSection = () => {
  return (
    <section className="py-12 bg-secondary/50 border-t border-border/30">
      <div className="container">
        <div className="flex items-start gap-4 max-w-3xl mx-auto">
          <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">Observação importante:</span>{" "}
            O masterplan apresentado é meramente ilustrativo e não representa o projeto oficial, 
            que será divulgado exclusivamente aos cadastrados no momento oportuno.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DisclaimerSection;
