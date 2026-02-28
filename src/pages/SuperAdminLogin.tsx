import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, Lock } from "lucide-react";

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

      // Verify admin role
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
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Icon + Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FFFF00]/10 flex items-center justify-center mx-auto mb-4 border border-[#FFFF00]/20">
            <Shield className="w-8 h-8 text-[#FFFF00]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Acesso restrito à gestão da plataforma</p>
        </div>

        {/* Card */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-2xl p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="sa-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  id="sa-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all"
                  placeholder="admin@enove.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sa-password" className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  id="sa-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#FFFF00] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,0,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Acessar Painel"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Área restrita • Enove Platform
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
