import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AuditLog {
  id: string; action: string; admin_user_id: string; target_tenant_id: string | null;
  after_data: any; created_at: string;
}

const SuperAdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(200) as any);
      if (error) throw error;
      setLogs(data || []);
    } catch { toast.error("Erro ao carregar logs"); } finally { setIsLoading(false); }
  };

  const filtered = logs.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || JSON.stringify(l.after_data || {}).toLowerCase().includes(search.toLowerCase()));

  const actionColor = (action: string) => {
    if (action.includes("created") || action.includes("create")) return "bg-emerald-500/20 text-emerald-400";
    if (action.includes("suspend") || action.includes("delete")) return "bg-red-500/20 text-red-400";
    if (action.includes("update")) return "bg-blue-500/20 text-blue-400";
    return "bg-slate-500/20 text-slate-400";
  };

  return (
    <>
      <Helmet><title>Auditoria | Super Admin</title></Helmet>
      <div className="text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#FFFF00]" />
            <h1 className="text-xl font-bold">Auditoria</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ação..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white" />
          </div>

          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500"><ScrollText className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Nenhum log encontrado</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-500 text-xs uppercase">
                        <th className="text-left py-3 px-4">Ação</th>
                        <th className="text-left py-3 px-4">Detalhes</th>
                        <th className="text-left py-3 px-4">Admin ID</th>
                        <th className="text-left py-3 px-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(l => (
                        <tr key={l.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20">
                          <td className="py-3 px-4"><Badge className={`text-xs ${actionColor(l.action)}`}>{l.action}</Badge></td>
                          <td className="py-3 px-4 text-xs text-slate-400 max-w-[300px] truncate font-mono">{JSON.stringify(l.after_data || {}).slice(0, 80)}</td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono">{l.admin_user_id.slice(0, 8)}…</td>
                          <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SuperAdminAudit;
