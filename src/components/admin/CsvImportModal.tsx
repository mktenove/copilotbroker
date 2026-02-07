import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseLeadsCsv,
  downloadCsvTemplate,
  ParsedLead,
  CsvParseResult,
} from "@/lib/csv-parser";

interface Broker {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultBrokerId?: string;
  hideBrokerSelect?: boolean;
}

const ORIGIN_OPTIONS = [
  { value: "importacao_csv", label: "Importação CSV" },
  { value: "meta_ads", label: "Meta ADS" },
  { value: "google_ads", label: "Google ADS" },
  { value: "instagram_organic", label: "Instagram Orgânico" },
  { value: "facebook_organic", label: "Facebook Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "plantao", label: "Plantão" },
  { value: "site", label: "Site" },
  { value: "whatsapp_direto", label: "WhatsApp Direto" },
];

const MAX_LEADS_PER_IMPORT = 500;
const BATCH_SIZE = 50;

export function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBrokerId,
  hideBrokerSelect,
}: CsvImportModalProps) {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // File and parsing state
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [brokerId, setBrokerId] = useState<string>(defaultBrokerId || "enove");
  const [origin, setOrigin] = useState<string>("importacao_csv");
  const [projectId, setProjectId] = useState<string>("");

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    duplicates: number;
  } | null>(null);

  // Fetch brokers and projects on mount
  useEffect(() => {
    if (isOpen) {
      fetchData();
      resetState();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [brokersRes, projectsRes] = await Promise.all([
        supabase
          .from("brokers")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("projects")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (brokersRes.data) setBrokers(brokersRes.data);
      if (projectsRes.data) {
        setProjects(projectsRes.data);
        if (projectsRes.data.length === 1) {
          setProjectId(projectsRes.data[0].id);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetState = () => {
    setParseResult(null);
    setFileName(null);
    setBrokerId(defaultBrokerId || "enove");
    setOrigin("importacao_csv");
    setProjectId(projects.length === 1 ? projects[0].id : "");
    setImportProgress(0);
    setImportResult(null);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = parseLeadsCsv(text);

      if (result.leads.length === 0) {
        toast.error("Nenhum lead encontrado no arquivo");
        return;
      }

      if (result.leads.length > MAX_LEADS_PER_IMPORT) {
        toast.error(`Máximo de ${MAX_LEADS_PER_IMPORT} leads por importação`);
        return;
      }

      setParseResult(result);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo CSV");
    }
  };

  const handleImport = async () => {
    if (!parseResult || !projectId) {
      toast.error("Selecione o empreendimento");
      return;
    }

    const validLeads = parseResult.leads.filter((l) => l.isValid);
    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido para importar");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;
    let duplicatesCount = 0;

    const originLabel =
      ORIGIN_OPTIONS.find((o) => o.value === origin)?.label || origin;

    // Check for existing leads in database
    const existingWhatsApps = new Set<string>();
    try {
      const { data: existingLeads } = await (supabase
        .from("leads" as any)
        .select("whatsapp")
        .in(
          "whatsapp",
          validLeads.map((l) => l.whatsapp)
        ) as any);

      if (existingLeads) {
        for (const lead of existingLeads) {
          existingWhatsApps.add(lead.whatsapp);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar duplicatas:", error);
    }

    // Filter out duplicates
    const leadsToImport = validLeads.filter((l) => {
      if (existingWhatsApps.has(l.whatsapp)) {
        duplicatesCount++;
        return false;
      }
      return true;
    });

    // Import in batches
    const batches = Math.ceil(leadsToImport.length / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, leadsToImport.length);
      const batch = leadsToImport.slice(start, end);

      try {
        // Prepare leads data
        const leadsData = batch.map((lead) => ({
          id: crypto.randomUUID(),
          name: lead.name.trim(),
          whatsapp: lead.whatsapp,
          source: brokerId === "enove" ? "enove" : "broker",
          status: "new",
          lead_origin: lead.origin || originLabel,
          project_id: projectId,
          broker_id: brokerId === "enove" ? null : brokerId,
        }));

        // Insert leads
        const { error: insertError } = await (supabase
          .from("leads" as any)
          .insert(leadsData as any) as any);

        if (insertError) {
          console.error("Erro ao inserir batch:", insertError);
          failedCount += batch.length;
        } else {
          successCount += batch.length;

          // Insert attributions
          const attributionsData = leadsData.map((lead) => ({
            lead_id: lead.id,
            project_id: projectId,
            landing_page: "csv_import",
          }));

          await (supabase
            .from("lead_attribution" as any)
            .insert(attributionsData as any) as any);
        }
      } catch (error) {
        console.error("Erro no batch:", error);
        failedCount += batch.length;
      }

      setImportProgress(Math.round(((i + 1) / batches) * 100));
    }

    setImportResult({
      success: successCount,
      failed: failedCount,
      duplicates: duplicatesCount,
    });
    setIsImporting(false);

    if (successCount > 0) {
      toast.success(`${successCount} leads importados com sucesso!`);
      onSuccess?.();
    }
  };

  const previewLeads = parseResult?.leads.slice(0, 5) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Leads via CSV
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Importe múltiplos leads de uma vez através de um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : importResult ? (
          // Import result screen
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Importação Concluída
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {importResult.success}
                </p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-destructive">
                  {importResult.failed}
                </p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
              <div className="bg-secondary/50 border border-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-secondary-foreground">
                  {importResult.duplicates}
                </p>
                <p className="text-xs text-muted-foreground">Duplicados</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-[#2a2a2e] hover:border-primary/50",
                parseResult && "border-primary bg-primary/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {parseResult ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    {fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {parseResult.validCount} válidos • {parseResult.errorCount}{" "}
                    erros
                    {parseResult.duplicatesInFile > 0 &&
                      ` • ${parseResult.duplicatesInFile} duplicados`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Arraste o arquivo CSV aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Máximo {MAX_LEADS_PER_IMPORT} leads por importação
                  </p>
                </div>
              )}
            </div>

            {/* Download template */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadCsvTemplate();
              }}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="w-4 h-4" />
              Baixar template CSV de exemplo
            </button>

            {/* Preview table */}
            {parseResult && previewLeads.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Prévia ({Math.min(5, parseResult.leads.length)} de{" "}
                  {parseResult.leads.length}):
                </Label>
                <div className="border border-[#2a2a2e] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a2a2e]/50">
                      <tr>
                        <th className="text-left p-2 text-muted-foreground font-medium">
                          Nome
                        </th>
                        <th className="text-left p-2 text-muted-foreground font-medium">
                          WhatsApp
                        </th>
                        <th className="text-center p-2 text-muted-foreground font-medium w-20">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewLeads.map((lead, index) => (
                        <tr key={index} className="border-t border-[#2a2a2e]">
                          <td className="p-2 text-foreground truncate max-w-[120px]">
                            {lead.name || "(vazio)"}
                          </td>
                          <td className="p-2 text-foreground font-mono text-xs">
                            {lead.whatsapp || "-"}
                          </td>
                          <td className="p-2 text-center">
                            {lead.isValid ? (
                              <Check className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <X className="w-4 h-4 text-destructive" />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseResult.errorCount > 0 && (
                  <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {parseResult.errorCount} linha(s) com erros serão
                      ignoradas
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-3 pt-2">
              {/* Empreendimento */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Empreendimento <span className="text-destructive">*</span>
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                    <SelectValue placeholder="Selecione o empreendimento" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id}
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Origem */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Origem padrão</Label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    {ORIGIN_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Corretor */}
              {!hideBrokerSelect && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Corretor</Label>
                  <Select value={brokerId} onValueChange={setBrokerId}>
                    <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                      <SelectValue placeholder="Selecione o corretor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                      <SelectItem
                        value="enove"
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        Enove (Sem corretor)
                      </SelectItem>
                      {brokers.map((broker) => (
                        <SelectItem
                          key={broker.id}
                          value={broker.id}
                          className="focus:bg-accent focus:text-accent-foreground"
                        >
                          {broker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Importando... {importProgress}%
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isImporting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  isImporting || !parseResult || parseResult.validCount === 0
                }
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : parseResult ? (
                  `Importar ${parseResult.validCount} Leads`
                ) : (
                  "Importar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
