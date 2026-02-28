import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface AddProjectModalProps {
  onSuccess: () => void;
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

interface TenantOption {
  id: string;
  name: string;
}

const AddProjectModal = ({ onSuccess }: AddProjectModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    city: "",
    tenant_id: "",
    status: "pre_launch",
  });

  useEffect(() => {
    if (open) loadTenants();
  }, [open]);

  const loadTenants = async () => {
    const { data } = await (supabase
      .from("tenants" as any)
      .select("id, name")
      .eq("status", "active")
      .order("name") as any);
    setTenants(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.tenant_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(form.name);
      const citySlug = generateSlug(form.city);

      const { error } = await (supabase
        .from("projects" as any)
        .insert({
          name: form.name.trim(),
          city: form.city.trim(),
          city_slug: citySlug,
          slug,
          tenant_id: form.tenant_id,
          status: form.status,
          is_active: true,
        }) as any);

      if (error) throw error;

      toast.success(`Empreendimento "${form.name}" criado com sucesso!`);
      setForm({ name: "", city: "", tenant_id: "", status: "pre_launch" });
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao criar empreendimento:", err);
      toast.error(err.message || "Erro ao criar empreendimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 hover:text-white">
          <FolderPlus className="w-4 h-4 mr-2" />
          Novo Empreendimento
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
        <DialogHeader>
          <DialogTitle>Novo Empreendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Empreendimento</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Golden View"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ex: Portão"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Tenant (Empresa)</Label>
            <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
              <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue placeholder="Selecione o tenant" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="pre_launch">Pré-Lançamento</SelectItem>
                <SelectItem value="launch">Lançamento</SelectItem>
                <SelectItem value="construction">Em Construção</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600]"
          >
            {isSubmitting ? "Criando..." : "Criar Empreendimento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectModal;
