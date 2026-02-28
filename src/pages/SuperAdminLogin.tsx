import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, Lock, Radar } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

interface SuperAdminLoginProps {
  onAuthenticated: () => void;
}

const SuperAdminLogin = ({ onAuthenticated }: SuperAdminLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles } = await (supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", data.user.id) as any);

      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Apenas super admins.");
        return;
      }

      toast.success("Acesso autorizado!");
      onAuthenticated();
    } catch (error: any) {
      if (error.message === "Invalid login credentials") {
        toast.error("Credenciais inválidas.");
      } else {
        toast.error(error.message || "Erro ao autenticar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Radar sweep */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full border border-[#FFFF00]/5" />
        <div className="absolute w-[600px] h-[600px] rounded-full border border-[#FFFF00]/5" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-[#FFFF00]/8" />
        <div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, transparent 340deg, rgba(255,255,0,0.06) 350deg, transparent 360deg)",
            animation: "radar-sweep 6s linear infinite",
          }}
        />
      </div>

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,0,0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,0,0.4) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={copilotLogo} alt="Copilot Broker" className="h-14 mx-auto mb-6" />
          <div className="w-14 h-14 rounded-xl bg-[#FFFF00]/10 border border-[#FFFF00]/20 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-[#FFFF00]" />
          </div>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#FFFF00]/50 mb-2">
            Control Tower
          </p>
          <h1 className="font-mono text-2xl font-bold text-white tracking-tight">
            Super Admin
          </h1>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            Acesso restrito à gestão da plataforma
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#FFFF00]/10 rounded-2xl p-8 shadow-[0_0_80px_rgba(255,255,0,0.03)]">
          {/* Status */}
          <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-[#FFFF00]/5 border border-[#FFFF00]/10">
            <Radar className="w-3.5 h-3.5 text-[#FFFF00] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFFF00]/60">
              Autenticação Segura
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="sa-email" className="block text-xs font-mono font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="email"
                  id="sa-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                  placeholder="admin@copilotbroker.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sa-password" className="block text-xs font-mono font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  id="sa-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#FFFF00] text-black font-mono font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:shadow-[0_0_40px_rgba(255,255,0,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Acessar Control Tower"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center mt-6">
          <span className="text-[10px] font-mono text-slate-700 tracking-wider">
            COPILOT BROKER • PLATFORM
          </span>
        </div>
      </div>

      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminLogin;
