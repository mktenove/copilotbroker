import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface Broker {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  email: string;
  whatsapp: string | null;
  is_active: boolean;
  created_at: string;
}

interface BrokerFormData {
  name: string;
  email: string;
  whatsapp: string;
  password: string;
}

const BrokerManagement = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [formData, setFormData] = useState<BrokerFormData>({
    name: "",
    email: "",
    whatsapp: "",
    password: "",
  });
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("brokers" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setBrokers((data || []) as Broker[]);
    } catch (error) {
      console.error("Erro ao buscar corretores:", error);
      toast.error("Erro ao carregar corretores.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOpenDialog = (broker?: Broker) => {
    if (broker) {
      setEditingBroker(broker);
      setFormData({
        name: broker.name,
        email: broker.email,
        whatsapp: broker.whatsapp || "",
        password: "",
      });
    } else {
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }

    if (!editingBroker && !formData.password) {
      toast.error("Senha é obrigatória para novos corretores.");
      return;
    }

    if (!editingBroker && formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingBroker) {
        // Atualizar corretor existente
        const { error } = await (supabase
          .from("brokers" as any)
          .update({
            name: formData.name.trim(),
            whatsapp: formData.whatsapp.trim() || null,
          })
          .eq("id", editingBroker.id) as any);

        if (error) throw error;
        toast.success("Corretor atualizado com sucesso!");
      } else {
        // Criar novo usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erro ao criar usuário");

        const userId = authData.user.id;
        const slug = generateSlug(formData.name);

        // Criar registro na tabela brokers
        const { error: brokerError } = await (supabase
          .from("brokers" as any)
          .insert({
            user_id: userId,
            name: formData.name.trim(),
            slug,
            email: formData.email.trim(),
            whatsapp: formData.whatsapp.trim() || null,
          }) as any);

        if (brokerError) throw brokerError;

        // Criar role do corretor
        const { error: roleError } = await (supabase
          .from("user_roles" as any)
          .insert({
            user_id: userId,
            role: "broker",
          }) as any);

        if (roleError) throw roleError;

        toast.success(`Corretor criado! URL: /estanciavelha/${slug}`);
      }

      setIsDialogOpen(false);
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "" });
      fetchBrokers();
    } catch (error: any) {
      console.error("Erro ao salvar corretor:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("Email ou slug já está em uso.");
      } else {
        toast.error(error.message || "Erro ao salvar corretor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBrokerStatus = async (broker: Broker) => {
    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .update({ is_active: !broker.is_active })
        .eq("id", broker.id) as any);

      if (error) throw error;
      toast.success(broker.is_active ? "Corretor desativado." : "Corretor ativado.");
      fetchBrokers();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do corretor.");
    }
  };

  const deleteBroker = async (broker: Broker) => {
    if (!confirm(`Tem certeza que deseja excluir ${broker.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .delete()
        .eq("id", broker.id) as any);

      if (error) throw error;
      toast.success("Corretor excluído com sucesso.");
      fetchBrokers();
    } catch (error) {
      console.error("Erro ao excluir corretor:", error);
      toast.error("Erro ao excluir corretor.");
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/estanciavelha/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando corretores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de adicionar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Corretores</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Corretor
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBroker ? "Editar Corretor" : "Novo Corretor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nome do corretor"
                />
                {!editingBroker && formData.name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    URL: /estanciavelha/{generateSlug(formData.name)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="email@exemplo.com"
                  disabled={!!editingBroker}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {!editingBroker && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de corretores */}
      {brokers.length === 0 ? (
        <div className="card-luxury p-12 text-center">
          <p className="text-muted-foreground">Nenhum corretor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="card-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Link</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {brokers.map((broker) => (
                  <tr key={broker.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{broker.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted-foreground">{broker.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleBrokerStatus(broker)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          broker.is_active
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        }`}
                      >
                        {broker.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">/estanciavelha/{broker.slug}</code>
                        <button
                          onClick={() => copyLink(broker.slug)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Copiar link"
                        >
                          {copiedSlug === broker.slug ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <a
                          href={`/estanciavelha/${broker.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Abrir página"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDialog(broker)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteBroker(broker)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerManagement;
