import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { useBrokerProjects } from "@/hooks/use-broker-projects";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Link as LinkIcon,
  RefreshCw,
  ArrowLeft,
  Save,
} from "lucide-react";
import { BrokerLayout } from "@/components/broker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const BrokerProjects = () => {
  const navigate = useNavigate();
  const { role, brokerId, isLoading: isRoleLoading } = useUserRole();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [editingSlug, setEditingSlug] = useState("");
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const {
    broker,
    brokerProjects,
    unassociatedProjects,
    isLoading,
    isSaving,
    addProject,
    removeProject,
    updateSlug,
  } = useBrokerProjects(brokerId);

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirect based on role
  useEffect(() => {
    if (!isRoleLoading && role === "admin") {
      navigate("/admin");
    }
    if (!isRoleLoading && role !== "broker") {
      navigate("/auth");
    }
  }, [role, isRoleLoading, navigate]);

  // Set editing slug when broker loads
  useEffect(() => {
    if (broker?.slug) {
      setEditingSlug(broker.slug);
    }
  }, [broker?.slug]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const openLanding = (url: string) => {
    window.open(url, "_blank");
  };

  const handleAddProjects = async () => {
    for (const projectId of selectedProjectIds) {
      await addProject(projectId);
    }
    setSelectedProjectIds([]);
    setIsAddDialogOpen(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSaveSlug = async () => {
    if (editingSlug === broker?.slug) {
      setIsSlugEditing(false);
      return;
    }

    const slugFormatted = editingSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const success = await updateSlug(slugFormatted);
    if (success) {
      setIsSlugEditing(false);
      setEditingSlug(slugFormatted);
    }
  };

  const brokerInitial = broker?.name?.charAt(0).toUpperCase() || "C";

  if (isRoleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  if (role !== "broker") {
    return null;
  }

  return (
    <BrokerLayout
      brokerName={broker?.name}
      brokerInitial={brokerInitial}
      viewMode={viewMode}
      onViewChange={setViewMode}
      onLogout={handleLogout}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/corretor/admin")}
            className="p-2 rounded-lg hover:bg-[#2a2a2e] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Meus Empreendimentos</h1>
            <p className="text-sm text-slate-400">
              Gerencie seus empreendimentos e links personalizados
            </p>
          </div>
        </div>

        {/* Add Project Button */}
        {unassociatedProjects.length > 0 && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1e1e22] border-[#2a2a2e]">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Adicionar Empreendimentos
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-slate-400">
                  Selecione os empreendimentos que deseja trabalhar:
                </p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {unassociatedProjects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f12] border border-[#2a2a2e] cursor-pointer hover:border-[#FFFF00]/30 transition-colors"
                    >
                      <Checkbox
                        checked={selectedProjectIds.includes(project.id)}
                        onCheckedChange={() => toggleProjectSelection(project.id)}
                        className="data-[state=checked]:bg-[#FFFF00] data-[state=checked]:border-[#FFFF00]"
                      />
                      <div>
                        <p className="font-medium text-white">{project.name}</p>
                        <p className="text-xs text-slate-500">{project.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedProjectIds([]);
                      setIsAddDialogOpen(false);
                    }}
                    className="text-slate-400"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddProjects}
                    disabled={selectedProjectIds.length === 0 || isSaving}
                    className="bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90"
                  >
                    {isSaving ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Projects List */}
      <div className="space-y-4 mb-8">
        {brokerProjects.length === 0 ? (
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              Você ainda não está associado a nenhum empreendimento.
            </p>
            {unassociatedProjects.length > 0 && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Empreendimento
              </Button>
            )}
          </div>
        ) : (
          brokerProjects.map((bp) => (
            <div
              key={bp.id}
              className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-[#FFFF00]" />
                    <h3 className="font-semibold text-white truncate">
                      {bp.project.name}
                    </h3>
                    <span className="text-xs text-slate-500 bg-[#0f0f12] px-2 py-0.5 rounded">
                      {bp.project.city}
                    </span>
                  </div>
                  <code className="block text-xs sm:text-sm bg-[#0f0f12] text-slate-300 px-3 py-2 rounded border border-[#2a2a2e] break-all">
                    {window.location.origin}{bp.url}
                  </code>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => copyUrl(bp.url)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#FFFF00]/10 text-[#FFFF00] rounded-lg hover:bg-[#FFFF00]/20 transition-colors text-sm"
                >
                  {copiedUrl === bp.url ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedUrl === bp.url ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={() => openLanding(bp.url)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#FFFF00] text-black font-medium rounded-lg hover:bg-[#FFFF00]/90 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir
                </button>
                <button
                  onClick={() => removeProject(bp.id)}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slug Editor */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-[#FFFF00]" />
          <h3 className="font-semibold text-white">Seu Link Personalizado</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">
              Slug (usado em todos os links)
            </Label>
            <div className="flex gap-2">
              <Input
                value={editingSlug}
                onChange={(e) => {
                  setIsSlugEditing(true);
                  setEditingSlug(e.target.value);
                }}
                placeholder="seu-nome"
                className="bg-[#0f0f12] border-[#2a2a2e] text-white"
              />
              {isSlugEditing && (
                <Button
                  onClick={handleSaveSlug}
                  disabled={isSaving || !editingSlug.trim()}
                  className="bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Este slug será usado em todos os seus links de empreendimentos.
            Alterar aqui atualizará automaticamente todos os links.
          </p>
        </div>
      </div>
    </BrokerLayout>
  );
};

export default BrokerProjects;
