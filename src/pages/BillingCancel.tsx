import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { XCircle, ArrowLeft } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const BillingCancel = () => {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "broker";
  const users = searchParams.get("users") || "";

  const retryUrl = `/signup?plan=${plan}${users ? `&users=${users}` : ""}`;

  return (
    <>
      <Helmet><title>Pagamento Cancelado | Copilot Broker</title></Helmet>
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <img src={copilotLogo} alt="Copilot Broker" className="h-10 mx-auto mb-8 opacity-60" />
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-mono">
            Pagamento cancelado
          </h1>
          <p className="text-slate-400 font-mono text-sm mb-8">
            Nenhuma cobrança foi realizada. Você pode tentar novamente quando quiser.
          </p>
          <Link
            to={retryUrl}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FFFF00] text-black font-mono font-bold text-sm uppercase tracking-wider rounded-xl hover:shadow-[0_0_40px_rgba(255,255,0,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Tentar novamente
          </Link>
        </div>
      </div>
    </>
  );
};

export default BillingCancel;
