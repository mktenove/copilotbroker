import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Loader2, Copy, CheckCircle2 } from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ autoAccepted: boolean; token?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { name: name.trim(), email: email.trim().toLowerCase(), whatsapp: whatsapp.trim() || null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.auto_accepted) {
        toast.success(`${name} foi adicionado à equipe!`);
        handleClose();
        onSuccess();
      } else {
        setResult({ autoAccepted: false, token: data?.token });
        toast.success("Convite criado com sucesso!");
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao convidar membro";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setWhatsapp("");
    setResult(null);
    onClose();
  };

  const inviteUrl = result?.token
    ? `${window.location.origin}/aceitar-convite?token=${result.token}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Membro
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Convite criado! Compartilhe o link abaixo com o novo membro."
              : "O membro receberá acesso ao CRM como corretor da sua organização."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 mt-2">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>Convite enviado para <strong>{email}</strong></span>
              </div>
              <p className="text-xs text-muted-foreground">
                O usuário precisa acessar o link abaixo para criar sua conta e ser adicionado à equipe.
              </p>
              <div className="flex items-center gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome *</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="corretor@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-whatsapp">WhatsApp</Label>
              <Input
                id="invite-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(51) 99999-9999"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Convidar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
