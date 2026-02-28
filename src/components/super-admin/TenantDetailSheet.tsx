import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FolderOpen, Link2, Unlink, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TenantDetailSheetProps {
  tenantId: string | null;
  tenantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Broker {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  city: string;
  status: string;
  is_active: boolean;
}

interface BrokerProject {
  id: string;
  broker_id: string;
  project_id: string;
  is_active: boolean;
}

const TenantDetailSheet = ({ tenantId, tenantName, open, onOpenChange }: TenantDetailSheetProps) => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [brokerProjects, setBrokerProjects] = useState<BrokerProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  useEffect(() => {
    if (open && tenantId) loadData();
  }, [open, tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [brokersRes, projectsRes, bpRes] = await Promise.all([
        supabase.from("brokers" as any).select("id, name, email, is_active").eq("tenant_id", tenantId) as any,
        supabase.from("projects" as any).select("id, name, city, status, is_active").eq("tenant_id", tenantId) as any,
        supabase.from("broker_projects" as any).select("id, broker_id, project_id, is_active").eq("tenant_id", tenantId) as any,
      ]);
      setBrokers(brokersRes.data || []);
      setProjects(projectsRes.data || []);
      setBrokerProjects(bpRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const linkBrokerToProject = async () => {
    if (!selectedBroker || !selectedProject || !tenantId) {
      toast.error("Selecione corretor e empreendimento");
      return;
    }

    const exists = brokerProjects.some(
      (bp) => bp.broker_id === selectedBroker && bp.project_id === selectedProject
    );
    if (exists) {
      toast.error("Este corretor já está vinculado a este empreendimento");
      return;
    }

    const { error } = await (supabase.from("broker_projects" as any).insert({
      broker_id: selectedBroker,
      project_id: selectedProject,
      tenant_id: tenantId,
      is_active: true,
    }) as any);

    if (error) {
      toast.error("Erro ao vincular: " + error.message);
      return;
    }

    toast.success("Corretor vinculado ao empreendimento!");
    setSelectedBroker("");
    setSelectedProject("");
    loadData();
  };

  const unlinkBrokerProject = async (bpId: string) => {
    const { error } = await (supabase.from("broker_projects" as any).delete().eq("id", bpId) as any);
    if (error) {
      toast.error("Erro ao desvincular");
      return;
    }
    toast.success("Vínculo removido");
    loadData();
  };

  const getBrokerName = (id: string) => brokers.find((b) => b.id === id)?.name || "—";
  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#1e1e22] border-[#2a2a2e] text-white w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFFF00]" />
            {tenantName}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Brokers */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Corretores ({brokers.length})
            </h3>
            {brokers.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum corretor vinculado</p>
            ) : (
              <div className="space-y-2">
                {brokers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-[#0f0f12] rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.email}</p>
                    </div>
                    <Badge variant="outline" className={b.is_active ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                      {b.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projects */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Empreendimentos ({projects.length})
            </h3>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum empreendimento cadastrado</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-[#0f0f12] rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.city} • {p.status}</p>
                    </div>
                    <Badge variant="outline" className={p.is_active ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link broker to project */}
          {brokers.length > 0 && projects.length > 0 && (
            <div className="border-t border-[#2a2a2e] pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Vincular Corretor a Empreendimento
              </h3>
              <div className="space-y-3">
                <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                  <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                    <SelectValue placeholder="Selecione o corretor" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    {brokers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                    <SelectValue placeholder="Selecione o empreendimento" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={linkBrokerToProject} className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600]">
                  <Plus className="w-4 h-4 mr-2" /> Vincular
                </Button>
              </div>
            </div>
          )}

          {/* Existing links */}
          {brokerProjects.length > 0 && (
            <div className="border-t border-[#2a2a2e] pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Vínculos Ativos</h3>
              <div className="space-y-2">
                {brokerProjects.map((bp) => (
                  <div key={bp.id} className="flex items-center justify-between bg-[#0f0f12] rounded-lg px-3 py-2">
                    <div className="text-sm">
                      <span className="text-white font-medium">{getBrokerName(bp.broker_id)}</span>
                      <span className="text-slate-500 mx-2">→</span>
                      <span className="text-slate-300">{getProjectName(bp.project_id)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkBrokerProject(bp.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TenantDetailSheet;
