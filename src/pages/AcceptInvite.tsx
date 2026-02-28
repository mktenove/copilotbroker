import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, AlertTriangle, CheckCircle2, Plane } from "lucide-react";
import { toast } from "sonner";
import copilotLogo from "@/assets/copilot-logo-dark.png";

type State = "validating" | "needs_auth" | "otp_sent" | "accepting" | "success" | "error";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<State>("validating");
  const [inviteEmail, setInviteEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const acceptingRef = useRef(false);

  // 1. Validate token + check session
  useEffect(() => {
    if (!token) {
      setErrorMsg("Token de convite não encontrado na URL.");
      setState("error");
      return;
    }

    const init = async () => {
      try {
        // Validate invite
        const { data, error } = await supabase.functions.invoke("validate-invite", {
          body: { token },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const email = data.email || "";
        setInviteEmail(email);

        // Check if already authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          // Already logged in — go straight to accept
          await acceptInvite();
        } else {
          setState("needs_auth");
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Convite inválido");
        setState("error");
      }
    };

    init();
  }, [token]);

  // 2. Listen for auth state changes (magic link redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session && state !== "accepting" && state !== "success" && !acceptingRef.current) {
          await acceptInvite();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [token, state]);

  const acceptInvite = async () => {
    if (acceptingRef.current) return;
    acceptingRef.current = true;
    setState("accepting");

    try {
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setState("success");
      toast.success("Convite aceito com sucesso!");
      setTimeout(() => navigate(data?.redirect || "/corretor/admin"), 2000);
    } catch (err: any) {
      acceptingRef.current = false;
      setErrorMsg(err?.message || "Erro ao aceitar convite");
      setState("error");
    }
  };

  const handleSendOtp = async () => {
    if (!inviteEmail) return;
    setIsOtpLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/aceitar-convite?token=${token}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      setState("otp_sent");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar link de acesso");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const getErrorIcon = () => {
    if (errorMsg.includes("expirou") || errorMsg.includes("cancelado")) {
      return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
    }
    return <AlertTriangle className="w-12 h-12 text-red-400" />;
  };

  return (
    <>
      <Helmet><title>Aceitar Convite | Copilot</title></Helmet>
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(rgba(255,255,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,0,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src={copilotLogo} alt="Copilot" className="h-8 opacity-80" />
            <div className="flex items-center gap-2 text-[#FFFF00]/60 text-xs tracking-[0.3em] uppercase">
              <Plane className="w-3 h-3" />
              <span>Sistema de Convites</span>
            </div>
          </div>

          {/* Card */}
          <div className="border border-[#FFFF00]/20 bg-black/80 backdrop-blur p-8 space-y-6">

            {/* VALIDATING */}
            {state === "validating" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFFF00]" />
                <p className="text-[#FFFF00]/80 text-sm tracking-wider">VALIDANDO CONVITE...</p>
              </div>
            )}

            {/* NEEDS AUTH */}
            {state === "needs_auth" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-lg font-bold text-[#FFFF00] tracking-wider">ACEITAR CONVITE</h1>
                  <p className="text-white/60 text-sm">
                    Você foi convidado para se juntar à equipe. Enviaremos um link de acesso para seu e-mail.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[#FFFF00]/60 text-xs tracking-wider uppercase">Email do convite</label>
                  <div className="border border-[#FFFF00]/20 bg-white/5 px-4 py-3 text-white/80 text-sm">
                    {inviteEmail}
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isOtpLoading}
                  className="w-full bg-[#FFFF00] text-black font-bold py-3 px-4 hover:bg-[#FFFF00]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wider uppercase"
                >
                  {isOtpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Enviar link de acesso
                </button>
              </div>
            )}

            {/* OTP SENT */}
            {state === "otp_sent" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-[#FFFF00]/40 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#FFFF00]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-[#FFFF00] tracking-wider">VERIFIQUE SEU E-MAIL</h2>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Enviamos um link de acesso para<br />
                    <span className="text-[#FFFF00]/80 font-semibold">{inviteEmail}</span>
                  </p>
                  <p className="text-white/40 text-xs mt-4">
                    Clique no link recebido para ativar seu acesso automaticamente.
                  </p>
                </div>
                <button
                  onClick={handleSendOtp}
                  className="text-[#FFFF00]/60 hover:text-[#FFFF00] text-xs underline underline-offset-4 mt-2 transition-colors"
                >
                  Reenviar link
                </button>
              </div>
            )}

            {/* ACCEPTING */}
            {state === "accepting" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFFF00]" />
                <p className="text-[#FFFF00]/80 text-sm tracking-wider">ATIVANDO SEU ACESSO...</p>
              </div>
            )}

            {/* SUCCESS */}
            {state === "success" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-emerald-400 tracking-wider">ACESSO ATIVADO</h2>
                  <p className="text-white/60 text-sm">Redirecionando para o painel...</p>
                </div>
              </div>
            )}

            {/* ERROR */}
            {state === "error" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                {getErrorIcon()}
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white/90 tracking-wider">CONVITE INVÁLIDO</h2>
                  <p className="text-white/60 text-sm leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={() => navigate("/auth")}
                  className="mt-4 border border-[#FFFF00]/30 text-[#FFFF00] px-6 py-2 text-sm hover:bg-[#FFFF00]/10 transition-colors tracking-wider uppercase"
                >
                  Ir para Login
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-white/20 text-xs tracking-wider">
            COPILOT BROKER © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
};

export default AcceptInvite;
