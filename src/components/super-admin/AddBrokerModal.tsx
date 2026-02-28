import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddBrokerModalProps {
  onSuccess: () => void;
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const AddBrokerModal = ({ onSuccess }: AddBrokerModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    plan_type: "broker" as string,
    included_users: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(form.name);

      // 1. Create tenant
      const { data: tenant, error: tenantError } = await (supabase
        .from("tenants" as any)
        .insert({
          name: form.name.trim(),
          slug,
          plan_type: form.plan_type,
          included_users: form.included_users,
          status: "active",
        })
        .select("id")
        .single() as any);

      if (tenantError) throw tenantError;

      // 2. Create entitlements
      const { error: entError } = await (supabase
        .from("tenant_entitlements" as any)
        .insert({
          tenant_id: tenant.id,
          max_users: form.included_users,
          features: { copilot: true, roletas: true, whatsapp: true, campaigns: true },
        }) as any);

      if (entError) console.error("Erro ao criar entitlements:", entError);

      // 3. Try to find user by email and link to tenant
      const { data: userData } = await supabase.auth.admin?.listUsers?.() || { data: null };
      
      // We'll look for the user in auth.users via a workaround - check if broker exists
      const { data: existingBroker } = await (supabase
        .from("brokers" as any)
        .select("id, user_id")
        .eq("email", form.email.trim())
        .maybeSingle() as any);

      if (existingBroker) {
        // Link broker to tenant
        await (supabase
          .from("brokers" as any)
          .update({ tenant_id: tenant.id })
          .eq("id", existingBroker.id) as any);

        // Create membership
        await (supabase
          .from("tenant_memberships" as any)
          .insert({
            tenant_id: tenant.id,
            user_id: existingBroker.user_id,
            role: "owner",
            is_active: true,
          }) as any);
      }

      toast.success(`Broker "${form.name}" adicionado com sucesso!`);
      setForm({ name: "", email: "", plan_type: "broker", included_users: 1 });
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao criar broker:", err);
      toast.error(err.message || "Erro ao adicionar broker");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Broker
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
        <DialogHeader>
          <DialogTitle>Adicionar Broker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa / Corretor</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Imobiliária XYZ"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>E-mail do responsável</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
              <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="broker">Corretor</SelectItem>
                <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                <SelectItem value="incorporadora">Incorporadora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Usuários inclusos</Label>
            <Input
              type="number"
              min={1}
              value={form.included_users}
              onChange={(e) => setForm({ ...form, included_users: parseInt(e.target.value) || 1 })}
              className="bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600]"
          >
            {isSubmitting ? "Adicionando..." : "Adicionar Broker"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBrokerModal;
