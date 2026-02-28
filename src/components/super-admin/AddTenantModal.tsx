import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

interface AddTenantModalProps {
  onSuccess: () => void;
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const AddTenantModal = ({ onSuccess }: AddTenantModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    owner_email: "",
    plan_type: "real_estate",
    status: "active",
    admin_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_email.trim()) {
      toast.error("Preencha nome e e-mail do responsável");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(form.name);

      // Check duplicate slug
      const { data: existing } = await (supabase
        .from("tenants" as any)
        .select("id")
        .eq("slug", slug)
        .maybeSingle() as any);

      if (existing) {
        toast.error("Já existe uma imobiliária com esse nome/slug");
        setIsSubmitting(false);
        return;
      }

      const { error } = await (supabase
        .from("tenants" as any)
        .insert({
          name: form.name.trim(),
          slug,
          owner_email: form.owner_email.trim().toLowerCase(),
          plan_type: form.plan_type,
          status: form.status,
          included_users: form.plan_type === "broker" ? 1 : 5,
          extra_users: 0,
          admin_notes: form.admin_notes.trim() || null,
        }) as any);

      if (error) throw error;

      // Audit log
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await (supabase.from("audit_logs" as any).insert({
          admin_user_id: session.user.id,
          action: "tenant_created",
          after_data: { name: form.name, slug, plan_type: form.plan_type, status: form.status },
        }) as any);
      }

      toast.success(`Imobiliária "${form.name}" criada com sucesso!`);
      setForm({ name: "", owner_email: "", plan_type: "real_estate", status: "active", admin_notes: "" });
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao criar imobiliária:", err);
      toast.error(err.message || "Erro ao criar imobiliária");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">
          <Plus className="w-4 h-4 mr-2" />
          Nova Imobiliária
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FFFF00]" />
            Nova Imobiliária
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Nome da Imobiliária *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Imobiliária Premium"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">E-mail do Responsável *</Label>
            <Input
              type="email"
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
              placeholder="admin@imobiliaria.com"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-300">Plano</Label>
              <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                  <SelectItem value="real_estate">Imobiliária</SelectItem>
                  <SelectItem value="broker">Corretor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notas internas (opcional)</Label>
            <Textarea
              value={form.admin_notes}
              onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
              placeholder="Observações sobre essa imobiliária..."
              className="bg-[#0f0f12] border-[#2a2a2e] text-white resize-none h-20"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600] font-semibold"
          >
            {isSubmitting ? "Criando..." : "Criar Imobiliária"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTenantModal;
