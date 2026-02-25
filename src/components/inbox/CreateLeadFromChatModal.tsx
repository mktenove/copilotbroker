import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid } from "lucide-react";

interface CreateLeadFromChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  suggestedName: string;
  brokerId: string;
  onCreated: (leadId: string, leadName: string, projectId: string | null) => void;
}

export function CreateLeadFromChatModal({
  open,
  onOpenChange,
  phone,
  suggestedName,
  brokerId,
  onCreated,
}: CreateLeadFromChatModalProps) {
  const [name, setName] = useState(suggestedName);
  const [projectId, setProjectId] = useState<string>("none");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(suggestedName);
      setProjectId("none");
      // Fetch broker's active projects
      const fetchProjects = async () => {
        const { data } = await supabase
          .from("broker_projects")
          .select("project:projects(id, name)")
          .eq("broker_id", brokerId)
          .eq("is_active", true);
        if (data) {
          const mapped = (data as any[])
            .filter((bp) => bp.project)
            .map((bp) => ({ id: bp.project.id, name: bp.project.name }));
          setProjects(mapped);
        }
      };
      fetchProjects();
    }
  }, [open, brokerId, suggestedName]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    onCreated(name.trim(), name.trim(), projectId !== "none" ? projectId : null);
    setIsLoading(false);
    onOpenChange(false);
  };

  const isPhoneName = suggestedName === phone || /^\d+$/.test(suggestedName.replace(/\D/g, ""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1e] border-[#2a2a2e] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <LayoutGrid className="w-5 h-5 text-orange-400" />
            Criar Card no Kanban
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phone (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">WhatsApp</Label>
            <Input
              value={phone}
              disabled
              className="bg-[#2a2a2e] border-[#3a3a3e] text-slate-300 text-sm"
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">
              Nome do Lead {isPhoneName && <span className="text-orange-400">*</span>}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome do lead"
              className="bg-[#2a2a2e] border-[#3a3a3e] text-white text-sm placeholder:text-slate-500"
              autoFocus={isPhoneName}
            />
            {isPhoneName && (
              <p className="text-[10px] text-orange-400">
                Não foi possível identificar o nome. Por favor, preencha.
              </p>
            )}
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Empreendimento</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-[#2a2a2e] border-[#3a3a3e] text-white text-sm">
                <SelectValue placeholder="Selecione o empreendimento" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="none" className="text-slate-400 text-sm">
                  Sem empreendimento
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-300 text-sm">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Criar Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
