import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, FileText, Loader2 } from "lucide-react";
import { useWhatsAppCampaigns } from "@/hooks/use-whatsapp-campaigns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TemplatesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "geral", label: "Geral" },
  { value: "follow_up", label: "Follow-up" },
  { value: "docs", label: "Documentos" },
  { value: "info", label: "Informações" },
];

const VARIABLES = [
  { var: "{nome}", desc: "Nome do lead" },
  { var: "{empreendimento}", desc: "Nome do projeto" },
  { var: "{corretor_nome}", desc: "Seu nome" },
];

export function TemplatesSheet({ open, onOpenChange }: TemplatesSheetProps) {
  const { templates, broker, createTemplate, updateTemplate, deleteTemplate } =
    useWhatsAppCampaigns();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("geral");
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName("");
    setContent("");
    setCategory("geral");
  };

  const handleEdit = (template: { id: string; name: string; content: string; category: string | null }) => {
    setIsEditing(true);
    setEditingId(template.id);
    setName(template.name);
    setContent(template.content);
    setCategory(template.category || "geral");
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Preencha nome e mensagem");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, { name, content, category });
      } else {
        await createTemplate({ name, content, category });
      }
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
    } catch (error) {
      console.error(error);
    }
  };

  const getPreview = () => {
    return content
      .replace(/{nome}/g, "João")
      .replace(/{empreendimento}/g, "Golden View")
      .replace(/{corretor_nome}/g, broker?.name?.split(" ")[0] || "Maria");
  };

  const filteredTemplates = templates.filter((t) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "mine") return t.broker_id === broker?.id;
    if (filterCategory === "global") return t.broker_id === null;
    return t.category === filterCategory;
  });

  const getCategoryLabel = (cat: string | null) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found?.label || "Geral";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[#0f0f12] border-[#2a2a2e]">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerenciar Templates
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Filter and New Button */}
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="flex-1 bg-[#1a1a1d] border-[#2a2a2e] text-white">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mine">Meus templates</SelectItem>
                <SelectItem value="global">Templates padrão</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>

          {/* Template List */}
          {!isEditing && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredTemplates.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    Nenhum template encontrado
                  </p>
                ) : (
                  filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="bg-[#1a1a1d] border-[#2a2a2e]"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-white truncate">
                                {template.name}
                              </h4>
                              {template.broker_id === null && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-500/10 text-blue-400 text-xs"
                                >
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Badge
                                variant="outline"
                                className="border-[#3a3a3e] text-slate-400"
                              >
                                {getCategoryLabel(template.category)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                              {template.content}
                            </p>
                          </div>
                          {template.broker_id === broker?.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-white"
                                onClick={() => handleEdit(template)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">
                                      Excluir template?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-[#2a2a2e] border-[#3a3a3e] text-white hover:bg-[#3a3a3e]">
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(template.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* Create/Edit Form */}
          {isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Template</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Primeiro contato"
                  className="bg-[#1a1a1d] border-[#2a2a2e] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#1a1a1d] border-[#2a2a2e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Mensagem</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Olá {nome}! Sou {corretor_nome}..."
                  className="bg-[#1a1a1d] border-[#2a2a2e] text-white min-h-[100px]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <Badge
                      key={v.var}
                      variant="secondary"
                      className="bg-[#2a2a2e] text-slate-300 cursor-pointer hover:bg-[#3a3a3e]"
                      onClick={() => setContent((c) => c + v.var)}
                    >
                      {v.var}
                    </Badge>
                  ))}
                </div>
              </div>

              {content && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Prévia</Label>
                  <div className="p-3 bg-[#1a1a1d] rounded-lg border border-[#2a2a2e]">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {getPreview()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 bg-[#2a2a2e] border-[#3a3a3e] text-white hover:bg-[#3a3a3e]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {editingId ? "Salvar" : "Criar Template"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
