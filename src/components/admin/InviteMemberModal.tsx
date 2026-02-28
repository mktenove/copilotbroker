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
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ acceptUrl: string; email: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-invite", {
        body: { email: email.trim().toLowerCase(), role: "broker" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({ acceptUrl: data.accept_url, email: data.email });
      toast.success("Convite criado com sucesso!");
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || "Erro ao criar convite";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Convidar Membro
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Convite criado! Compartilhe o link abaixo com o novo membro."
              : "Envie um convite para um corretor se juntar à sua organização."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 mt-2">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span>Convite criado para <strong>{result.email}</strong></span>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link para o convidado. Ele poderá criar sua conta e ser adicionado à equipe automaticamente.
              </p>
              <div className="flex items-center gap-2">
                <Input value={result.acceptUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.acceptUrl);
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
              <Label htmlFor="invite-email">Email do corretor *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="corretor@email.com"
                required
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
