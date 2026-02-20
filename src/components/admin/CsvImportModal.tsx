import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Info,
  Phone,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseCsvText,
  autoDetectMapping,
  processImportData,
  downloadCsvTemplate,
  FieldMapping,
  RowValidation,
  ImportProcessResult,
} from "@/lib/csv-parser";

// ── Types ──────────────────────────────────────────────────────────────

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
  { value: "importacao_google_contacts", label: "Importação Google Contacts" },
  { value: "importacao_csv", label: "Importação CSV" },
  { value: "meta_ads", label: "Meta ADS" },
  { value: "google_ads", label: "Google ADS" },
  { value: "indicacao", label: "Indicação" },
  { value: "plantao", label: "Plantão" },
  { value: "whatsapp_direto", label: "WhatsApp Direto" },
];

const STEPS = [
  "Upload",
  "Pré-visualização",
  "Mapeamento",
  "Regras",
  "Validação",
  "Importação",
];

const BATCH_SIZE = 200;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBrokerId,
  hideBrokerSelect,
}: CsvImportModalProps) {
  // Step
  const [step, setStep] = useState(1);

  // Data loading
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Step 1 — Upload
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Mapping
  const [mapping, setMapping] = useState<FieldMapping>({
    nameColumns: [],
    phoneColumn: "",
    originColumn: null,
  });
  const [concatName, setConcatName] = useState(false);
  const [nameCol1, setNameCol1] = useState("");
  const [nameCol2, setNameCol2] = useState("");

  // Step 4 — Rules
  const [duplicateStrategy, setDuplicateStrategy] = useState<"ignore" | "create">("ignore");
  const [autoFix9thDigit, setAutoFix9thDigit] = useState(true);
  const [defaultDdd, setDefaultDdd] = useState("");
  const [projectId, setProjectId] = useState("");
  const [origin, setOrigin] = useState("importacao_google_contacts");
  const [assignBroker, setAssignBroker] = useState(false);
  const [brokerId, setBrokerId] = useState(defaultBrokerId || "");

  // Step 5 — Validation
  const [processResult, setProcessResult] = useState<ImportProcessResult | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);
  const [showFixed, setShowFixed] = useState(false);

  // Step 6 — Import
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    duplicatesIgnored: number;
    phonesFixed: number;
  } | null>(null);

  // ── Lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      fetchData();
      resetAll();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [brokersRes, projectsRes] = await Promise.all([
        supabase.from("brokers").select("id, name, slug").eq("is_active", true).order("name"),
        supabase.from("projects").select("id, name, slug").eq("is_active", true).order("name"),
      ]);
      if (brokersRes.data) setBrokers(brokersRes.data);
      if (projectsRes.data) {
        setProjects(projectsRes.data);
        if (projectsRes.data.length === 1) setProjectId(projectsRes.data[0].id);
      }
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setFileName(null);
    setRawHeaders([]);
    setRawRows([]);
    setMapping({ nameColumns: [], phoneColumn: "", originColumn: null });
    setConcatName(false);
    setNameCol1("");
    setNameCol2("");
    setDuplicateStrategy("ignore");
    setAutoFix9thDigit(true);
    setDefaultDdd("");
    setProjectId(projects.length === 1 ? projects[0]?.id || "" : "");
    setOrigin("importacao_google_contacts");
    setAssignBroker(!!defaultBrokerId);
    setBrokerId(defaultBrokerId || "");
    setProcessResult(null);
    setShowInvalid(false);
    setShowFixed(false);
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setImportResult(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Step 1: File Processing ──────────────────────────────────────────

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecione um arquivo .csv");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo excede 10MB");
      return;
    }

    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);

      if (rows.length === 0) {
        toast.error("Arquivo vazio ou sem dados");
        return;
      }

      setFileName(file.name);
      setRawHeaders(headers);
      setRawRows(rows);

      // Auto-detect mapping
      const detected = autoDetectMapping(headers);
      setMapping(detected);

      if (detected.nameColumns.length === 2) {
        setConcatName(true);
        setNameCol1(detected.nameColumns[0]);
        setNameCol2(detected.nameColumns[1]);
      } else if (detected.nameColumns.length === 1) {
        setConcatName(false);
        setNameCol1(detected.nameColumns[0]);
        setNameCol2("");
      }

      setStep(2);
    } catch (err) {
      console.error("Erro ao processar CSV:", err);
      toast.error("Erro ao ler o arquivo CSV");
    }
  };

  // ── Step 3: Build mapping from UI state ──────────────────────────────

  const currentMapping = useMemo((): FieldMapping => {
    const nameColumns = concatName && nameCol2
      ? [nameCol1, nameCol2].filter(Boolean)
      : [nameCol1].filter(Boolean);
    return {
      nameColumns,
      phoneColumn: mapping.phoneColumn,
      originColumn: mapping.originColumn,
    };
  }, [concatName, nameCol1, nameCol2, mapping.phoneColumn, mapping.originColumn]);

  const canAdvanceStep3 = currentMapping.nameColumns.length > 0 && currentMapping.phoneColumn;

  // ── Step 5: Run validation ───────────────────────────────────────────

  useEffect(() => {
    if (step === 5 && rawRows.length > 0) {
      const originLabel = ORIGIN_OPTIONS.find(o => o.value === origin)?.label || origin;
      const result = processImportData(rawRows, currentMapping, {
        autoFix9thDigit,
        defaultOrigin: originLabel,
        defaultDdd,
      });
      setProcessResult(result);
    }
  }, [step]);

  // ── Step 6: Import ──────────────────────────────────────────────────

  const handleImport = async () => {
    if (!processResult || !projectId) return;

    setIsImporting(true);
    const leadsToImport = [...processResult.validRows];
    let successCount = 0;
    let failedCount = 0;
    let duplicatesIgnored = 0;

    // Check DB duplicates
    if (duplicateStrategy === "ignore") {
      const phones = leadsToImport.map(r => r.phone);
      const batchSize = 500;
      const existingPhones = new Set<string>();

      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize);
        const { data } = await (supabase
          .from("leads" as any)
          .select("whatsapp")
          .in("whatsapp", batch) as any);
        if (data) data.forEach((d: any) => existingPhones.add(d.whatsapp));
      }

      // Remove duplicates
      const filtered = leadsToImport.filter(r => {
        if (existingPhones.has(r.phone)) {
          duplicatesIgnored++;
          return false;
        }
        return true;
      });
      leadsToImport.length = 0;
      leadsToImport.push(...filtered);
    }

    const total = leadsToImport.length;
    setImportProgress({ current: 0, total });

    const resolvedBrokerId = hideBrokerSelect
      ? defaultBrokerId || null
      : assignBroker && brokerId
        ? brokerId
        : null;

    const originLabel = ORIGIN_OPTIONS.find(o => o.value === origin)?.label || origin;
    const batches = Math.ceil(total / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, total);
      const batch = leadsToImport.slice(start, end);

      try {
        const leadsData = batch.map(row => ({
          id: crypto.randomUUID(),
          name: row.name,
          whatsapp: row.phone,
          source: resolvedBrokerId ? "broker" : "enove",
          status: "new" as const,
          lead_origin: row.origin || originLabel,
          project_id: projectId,
          broker_id: resolvedBrokerId,
        }));

        const { error } = await (supabase
          .from("leads" as any)
          .insert(leadsData as any) as any);

        if (error) {
          console.error("Erro no batch:", error);
          failedCount += batch.length;
        } else {
          successCount += batch.length;

          // Attribution
          const attrs = leadsData.map(l => ({
            lead_id: l.id,
            project_id: projectId,
            landing_page: "csv_import",
          }));
          await (supabase.from("lead_attribution" as any).insert(attrs as any) as any);

          // Log interactions for audit
          const interactions = leadsData.map(l => ({
            lead_id: l.id,
            interaction_type: "registration" as const,
            notes: `Importado via CSV (${fileName})`,
            broker_id: resolvedBrokerId,
          }));
          await (supabase.from("lead_interactions" as any).insert(interactions as any) as any);
        }
      } catch (err) {
        console.error("Erro no batch:", err);
        failedCount += batch.length;
      }

      setImportProgress({ current: end, total });
    }

    setImportResult({
      success: successCount,
      failed: failedCount,
      duplicatesIgnored,
      phonesFixed: processResult.phonesFixed.length,
    });
    setIsImporting(false);

    if (successCount > 0) {
      toast.success(`${successCount} leads importados!`);
      onSuccess?.();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  const headerOptions = rawHeaders.map(h => ({ value: h, label: h }));
  const ignoreOption = { value: "__ignore__", label: "— Ignorar —" };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Stepper */}
        <div className="border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importar Contatos (CSV)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Exporte do Google Contatos em CSV e envie aqui
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1">
            {STEPS.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                        isDone && "bg-primary text-primary-foreground",
                        isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                        !isActive && !isDone && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1 truncate max-w-full text-center",
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn(
                      "h-px flex-1 min-w-2",
                      isDone ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── STEP 1: Upload ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-foreground font-medium">Arraste o CSV aqui ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">Máximo 10MB • Formato .csv</p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground mb-1">Como exportar do Google Contatos:</p>
                      <p>Google Contatos → Exportar → Formato "CSV Google" → Download</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); downloadCsvTemplate(); }}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Baixar template CSV de exemplo
                  </button>
                </div>
              )}

              {/* ── STEP 2: Preview ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{fileName}</span>
                      {" — "}{rawRows.length} linhas, {rawHeaders.length} colunas
                    </p>
                  </div>

                  <div className="border border-border rounded-lg overflow-auto max-h-[340px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-2 text-muted-foreground font-medium border-b border-border">#</th>
                          {rawHeaders.map(h => (
                            <th key={h} className="text-left p-2 text-muted-foreground font-medium border-b border-border whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            {rawHeaders.map(h => (
                              <td key={h} className="p-2 text-foreground max-w-[150px] truncate">{row[h] || ""}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rawRows.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Exibindo 20 de {rawRows.length} linhas
                    </p>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                    <Button size="sm" onClick={() => setStep(3)}>
                      Próximo <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Mapping ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Mapeie as colunas do CSV para os campos do CRM.
                  </p>

                  {/* Name mapping */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground font-medium flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        Nome <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Concatenar campos</Label>
                        <Switch checked={concatName} onCheckedChange={setConcatName} />
                      </div>
                    </div>

                    <div className={cn("grid gap-2", concatName ? "grid-cols-2" : "grid-cols-1")}>
                      <Select value={nameCol1} onValueChange={setNameCol1}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder={concatName ? "Primeiro Nome" : "Selecione a coluna do nome"} />
                        </SelectTrigger>
                        <SelectContent>
                          {headerOptions.map(h => (
                            <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {concatName && (
                        <Select value={nameCol2} onValueChange={setNameCol2}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Sobrenome" />
                          </SelectTrigger>
                          <SelectContent>
                            {headerOptions.map(h => (
                              <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Phone mapping */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-primary" />
                      Telefone Principal <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={mapping.phoneColumn}
                      onValueChange={v => setMapping(m => ({ ...m, phoneColumn: v }))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione a coluna do telefone" />
                      </SelectTrigger>
                      <SelectContent>
                        {headerOptions.map(h => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Origin mapping */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium text-sm">
                      Origem <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Select
                      value={mapping.originColumn || "__ignore__"}
                      onValueChange={v => setMapping(m => ({
                        ...m,
                        originColumn: v === "__ignore__" ? null : v,
                      }))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ignoreOption.value}>{ignoreOption.label}</SelectItem>
                        {headerOptions.map(h => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                    <Button size="sm" disabled={!canAdvanceStep3} onClick={() => setStep(4)}>
                      Próximo <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Rules ── */}
              {step === 4 && (
                <div className="space-y-5">
                  {/* Duplicate strategy */}
                  <div className="space-y-3">
                    <Label className="text-foreground font-medium">Duplicidade</Label>
                    <RadioGroup
                      value={duplicateStrategy}
                      onValueChange={v => setDuplicateStrategy(v as any)}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
                        <RadioGroupItem value="ignore" id="dup-ignore" />
                        <Label htmlFor="dup-ignore" className="cursor-pointer flex-1">
                          <span className="text-foreground font-medium">Ignorar duplicados</span>
                          <span className="block text-xs text-muted-foreground">Telefones já existentes serão ignorados</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
                        <RadioGroupItem value="create" id="dup-create" />
                        <Label htmlFor="dup-create" className="cursor-pointer flex-1">
                          <span className="text-foreground font-medium">Criar mesmo assim</span>
                          <span className="block text-xs text-yellow-500">⚠ Não recomendado — pode gerar duplicatas</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 9th digit */}
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                    <div>
                      <Label className="text-foreground font-medium">Corrigir 9º dígito automaticamente</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Insere o "9" quando número celular tiver 8 dígitos</p>
                    </div>
                    <Switch checked={autoFix9thDigit} onCheckedChange={setAutoFix9thDigit} />
                  </div>

                  {/* Default DDD */}
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    <Label className="text-foreground font-medium">DDD padrão para números sem DDD</Label>
                    <p className="text-xs text-muted-foreground">Números com 8 ou 9 dígitos receberão este DDD automaticamente (ex: 51, 11, 21)</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="Ex: 51"
                      value={defaultDdd}
                      onChange={e => setDefaultDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  {/* Project */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      Empreendimento <span className="text-destructive">*</span>
                    </Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Default origin */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Origem padrão</Label>
                    <Select value={origin} onValueChange={setOrigin}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGIN_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Broker assignment */}
                  {!hideBrokerSelect && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                        <Label className="text-foreground font-medium">Atribuir ao corretor</Label>
                        <Switch checked={assignBroker} onCheckedChange={setAssignBroker} />
                      </div>
                      {assignBroker && (
                        <Select value={brokerId} onValueChange={setBrokerId}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Selecione o corretor" />
                          </SelectTrigger>
                          <SelectContent>
                            {brokers.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                    <Button size="sm" disabled={!projectId} onClick={() => setStep(5)}>
                      Validar <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Validation Summary ── */}
              {step === 5 && processResult && (
                <div className="space-y-4">
                  {/* Metric cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <MetricCard icon={Users} label="Total" value={processResult.totalRows} color="text-foreground" />
                    <MetricCard icon={CheckCircle2} label="Válidos" value={processResult.validRows.length} color="text-green-500" />
                    <MetricCard icon={XCircle} label="Inválidos" value={processResult.invalidRows.length} color="text-destructive" />
                    <MetricCard icon={Wrench} label="Corrigidos (9º dígito)" value={processResult.phonesFixed.length} color="text-amber-500" />
                    <MetricCard icon={Ban} label="Duplicados (arquivo)" value={processResult.duplicatesInFile} color="text-muted-foreground" />
                  </div>

                  {/* Invalid rows collapsible */}
                  {processResult.invalidRows.length > 0 && (
                    <Collapsible open={showInvalid} onOpenChange={setShowInvalid}>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-destructive hover:underline w-full">
                        {showInvalid ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Ver {processResult.invalidRows.length} linhas inválidas
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border border-border rounded-lg overflow-auto max-h-[200px] mt-2">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2 text-muted-foreground">Linha</th>
                                <th className="text-left p-2 text-muted-foreground">Nome</th>
                                <th className="text-left p-2 text-muted-foreground">Telefone</th>
                                <th className="text-left p-2 text-muted-foreground">Erro</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processResult.invalidRows.map((r, i) => (
                                <tr key={i} className="border-t border-border/50">
                                  <td className="p-2 text-muted-foreground">{r.rowIndex}</td>
                                  <td className="p-2 truncate max-w-[120px]">{r.name || "(vazio)"}</td>
                                  <td className="p-2 font-mono">{r.phoneResult.original || "-"}</td>
                                  <td className="p-2 text-destructive">{r.errors.join("; ")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Fixed phones collapsible */}
                  {processResult.phonesFixed.length > 0 && (
                    <Collapsible open={showFixed} onOpenChange={setShowFixed}>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-500 hover:underline w-full">
                        {showFixed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Ver {processResult.phonesFixed.length} telefones corrigidos
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border border-border rounded-lg overflow-auto max-h-[200px] mt-2">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2 text-muted-foreground">Linha</th>
                                <th className="text-left p-2 text-muted-foreground">Original</th>
                                <th className="text-left p-2 text-muted-foreground">Corrigido</th>
                                <th className="text-left p-2 text-muted-foreground">Descrição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processResult.phonesFixed.map((r, i) => (
                                <tr key={i} className="border-t border-border/50">
                                  <td className="p-2 text-muted-foreground">{r.rowIndex}</td>
                                  <td className="p-2 font-mono">{r.phoneResult.original}</td>
                                  <td className="p-2 font-mono text-green-500">{r.phone}</td>
                                  <td className="p-2 text-amber-500">{r.phoneResult.fixDescription}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Phone format info */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <p>Formato esperado: <span className="font-mono text-foreground">5551999999999</span> (somente dígitos, com prefixo 55)</p>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                    <Button
                      size="sm"
                      disabled={processResult.validRows.length === 0}
                      onClick={() => { setStep(6); handleImport(); }}
                    >
                      Importar {processResult.validRows.length} contatos <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Import + Results ── */}
              {step === 6 && (
                <div className="space-y-6 py-2">
                  {isImporting ? (
                    <div className="space-y-4 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-foreground font-medium">
                        Importando... {importProgress.current} de {importProgress.total}
                      </p>
                      <Progress
                        value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  ) : importResult ? (
                    <div className="space-y-5">
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Check className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Importação Concluída</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <MetricCard icon={CheckCircle2} label="Importados" value={importResult.success} color="text-green-500" />
                        <MetricCard icon={XCircle} label="Erros" value={importResult.failed} color="text-destructive" />
                        <MetricCard icon={Ban} label="Duplicados ignorados" value={importResult.duplicatesIgnored} color="text-muted-foreground" />
                        <MetricCard icon={Wrench} label="Telefones corrigidos" value={importResult.phonesFixed} color="text-amber-500" />
                      </div>

                      <Button onClick={handleClose} className="w-full">
                        Fechar
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Metric Card Component ──────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center gap-3">
      <Icon className={cn("w-5 h-5 shrink-0", color)} />
      <div>
        <p className={cn("text-xl font-bold", color)}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
