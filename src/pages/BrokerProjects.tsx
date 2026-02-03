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
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { BrokerLayout } from "@/components/broker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [projectToRemove, setProjectToRemove] = useState<string | null>(null);

  const {
    broker,
    brokerProjects,
    unassociatedProjects,
    isLoading,
    isSaving,
    addProject,
    removeProject,
    updateSlug,
    pendingCount,
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

  const copyAllUrls = async () => {
    const allUrls = brokerProjects
      .map((bp) => `${bp.project.name}: ${window.location.origin}${bp.url}`)
      .join("\n");
    await navigator.clipboard.writeText(allUrls);
    toast.success("Todos os links copiados!");
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

  const handleRemoveProject = async () => {
    if (!projectToRemove) return;
    await removeProject(projectToRemove);
    setProjectToRemove(null);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/corretor/admin")}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Meus Empreendimentos</h1>
            <p className="text-sm text-muted-foreground">
              {brokerProjects.length} {brokerProjects.length === 1 ? 'ativo' : 'ativos'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {brokerProjects.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllUrls}
              className="text-xs"
            >
              <ClipboardList className="w-4 h-4 mr-1" />
              Copiar todos
            </Button>
          )}
          
          {unassociatedProjects.length > 0 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Adicionar Empreendimentos
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Selecione os empreendimentos que deseja trabalhar:
                  </p>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {unassociatedProjects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border cursor-pointer hover:border-primary/30 transition-colors"
                      >
                        <Checkbox
                          checked={selectedProjectIds.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                        />
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.city}</p>
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
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddProjects}
                      disabled={selectedProjectIds.length === 0 || isSaving}
                    >
                      {isSaving ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Pending Projects Banner */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {pendingCount === 1 
                    ? "Novo empreendimento disponível!" 
                    : `${pendingCount} novos empreendimentos disponíveis!`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount === 1 
                    ? "Adicione à sua carteira e comece a captar leads" 
                    : "Adicione à sua carteira e amplie sua captação"}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar agora
            </Button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid gap-3 mb-6">
        {brokerProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não está associado a nenhum empreendimento.
            </p>
            {unassociatedProjects.length > 0 && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Empreendimento
              </Button>
            )}
          </div>
        ) : (
          brokerProjects.map((bp) => (
            <div
              key={bp.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {bp.project.name}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                      {bp.project.city}
                    </span>
                  </div>
                  <code className="text-xs text-muted-foreground break-all block">
                    {window.location.origin}{bp.url}
                  </code>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyUrl(bp.url)}
                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Copiar link"
                  >
                    {copiedUrl === bp.url ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openLanding(bp.url)}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Abrir landing page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProjectToRemove(bp.id)}
                    disabled={isSaving}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    title="Remover empreendimento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slug Editor */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Seu Link Personalizado</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
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
                className="bg-background"
              />
              {isSlugEditing && (
                <Button
                  onClick={handleSaveSlug}
                  disabled={isSaving || !editingSlug.trim()}
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
          <p className="text-xs text-muted-foreground">
            Este slug será usado em todos os seus links de empreendimentos.
            Alterar aqui atualizará automaticamente todos os links.
          </p>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!projectToRemove} onOpenChange={() => setProjectToRemove(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover Empreendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este empreendimento? Você poderá adicioná-lo novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BrokerLayout>
  );
};

export default BrokerProjects;
