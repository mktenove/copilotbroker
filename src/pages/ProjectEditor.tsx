import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Project, LandingPageData } from "@/types/project";
import { LANDING_THEMES, resolveTheme, DynamicIcon, LandingPageRenderer } from "@/pages/LandingPage";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Save,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Video,
  Image as ImageIcon,
  RotateCcw,
  MapPin,
  CheckCircle2,
  Zap,
  Users,
  Trash2,
  GalleryHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BrokerInfo {
  id: string;
  name: string;
  slug: string;
}

type ProjectRecord = Partial<Project> & {
  id: string;
  name: string;
  slug: string;
  city: string;
  city_slug: string | null;
  status: string;
  is_active: boolean;
  tenant_id: string | null;
  webhook_url: string | null;
  landing_page_status?: 'draft' | 'published' | null;
  landing_page_data?: LandingPageData | null;
  main_image_url?: string | null;
  video_url?: string | null;
};

// ─── Section edit helpers ─────────────────────────────────────────────────────
interface SectionConfig {
  key: keyof LandingPageData;
  label: string;
  icon: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "hero", label: "Hero", icon: "🎯" },
  { key: "location", label: "Localização", icon: "📍" },
  { key: "features", label: "Diferenciais", icon: "⭐" },
  { key: "audience", label: "Para quem é", icon: "👥" },
  { key: "urgency", label: "Urgência / Oportunidade", icon: "⚡" },
  { key: "benefits", label: "Benefícios do cadastro", icon: "✅" },
  { key: "cta", label: "CTA Final", icon: "🚀" },
  { key: "form", label: "Formulário", icon: "📋" },
];

// ─── Inline text editor for individual fields ─────────────────────────────────
function EditableField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0f0f12] border-[#2a2a2e] text-sm h-8"
        />
      )}
    </div>
  );
}

// ─── Inline editable text (click-to-edit in preview) ─────────────────────────
function EditableText({
  value,
  onSave,
  className,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={() => ref.current && onSave(ref.current.innerText.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ref.current?.blur(); }
        if (e.key === "Escape") { if (ref.current) ref.current.innerText = value; ref.current?.blur(); }
      }}
      className={cn(
        "outline-none cursor-text hover:ring-1 hover:ring-yellow-400/50 focus:ring-2 focus:ring-yellow-400/80 rounded px-0.5 -mx-0.5 transition-all",
        className
      )}
      style={style}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MAX_IMAGES_PER_PROJECT = 50;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/mpeg,video/x-m4v,video/x-matroska,video/webm,video/*";

/** Convert image to WebP via Canvas. Falls back to the original file if it fails (e.g. HEIC on desktop). */
async function convertToWebP(file: File, quality = 0.85): Promise<{ blob: Blob; ext: string; contentType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const fallback = () => {
      URL.revokeObjectURL(url);
      const ext = file.name.split(".").pop() || "jpg";
      resolve({ blob: file, ext, contentType: file.type || "image/jpeg" });
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { fallback(); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve({ blob, ext: "webp", contentType: "image/webp" });
        else fallback();
      }, "image/webp", quality);
    };
    img.onerror = fallback;
    img.src = url;
  });
}

async function countProjectImages(projectId: string): Promise<number> {
  const { data } = await supabase.storage.from("project-media").list(`projects/${projectId}`);
  if (!data) return 0;
  return data.filter((f) => /\.(webp|jpg|jpeg|png|gif|heic|avif)$/i.test(f.name)).length;
}

// ─── Image upload field ───────────────────────────────────────────────────────
function ImageUploadField({
  label,
  value,
  onChange,
  projectId,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  projectId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Check image count (only when adding new — not replacing)
      if (!value) {
        const count = await countProjectImages(projectId);
        if (count >= MAX_IMAGES_PER_PROJECT) {
          toast.error(`Limite de ${MAX_IMAGES_PER_PROJECT} imagens por projeto atingido`);
          return;
        }
      }
      // Convert to WebP (falls back to original if conversion fails)
      const { blob, ext, contentType } = await convertToWebP(file);
      const path = `projects/${projectId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("project-media")
        .upload(path, blob, { upsert: true, contentType });
      if (error) {
        console.error("[ImageUpload] storage error:", error);
        throw new Error(error.message);
      }
      const { data: { publicUrl } } = supabase.storage
        .from("project-media")
        .getPublicUrl(path);
      console.log("[ImageUpload] uploaded:", publicUrl);
      onChange(publicUrl);
      toast.success("Imagem enviada!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ImageUpload] error:", msg);
      toast.error("Erro no upload: " + msg, { duration: 6000 });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {value && (
        <div className="relative rounded-lg overflow-hidden h-24 bg-[#0f0f12] border border-[#2a2a2e]">
          <img src={value} className="w-full h-full object-cover" alt="" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="w-full text-xs border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1 h-8"
      >
        {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
        {uploading ? "Convertendo para WebP..." : value ? "Trocar imagem" : "Enviar imagem"}
      </Button>
    </div>
  );
}

// ─── Video upload field ───────────────────────────────────────────────────────
function VideoUploadField({
  label,
  value,
  onChange,
  projectId,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  projectId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("O vídeo deve ter no máximo 50 MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `projects/${projectId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("project-media")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from("project-media")
        .getPublicUrl(path);
      onChange(publicUrl);
    } catch (err) {
      toast.error("Erro no upload: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {value && (
        <div className="relative rounded-lg overflow-hidden bg-[#0f0f12] border border-[#2a2a2e] p-2">
          <video src={value} className="w-full max-h-32 rounded" controls />
          <button
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1 rounded bg-black/60 hover:bg-black/80 text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={handleFile} />
      <Button
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="w-full text-xs border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1 h-8"
      >
        {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
        {value ? "Trocar vídeo" : "Enviar vídeo (máx. 50 MB)"}
      </Button>
    </div>
  );
}

// ─── Floating inline text/style editor ───────────────────────────────────────
type ElementStyle = { color?: string; fontSize?: number; background?: string; backgroundOpacity?: number };

function FloatingTextEditor({
  path,
  value,
  rect,
  elementStyle,
  computedColor,
  computedBg,
  onSave,
  onStyleChange,
  onClose,
}: {
  path: string;
  value: string;
  rect: DOMRect;
  elementStyle?: ElementStyle;
  computedColor?: string;
  computedBg?: string;
  onSave: (path: string, value: string) => void;
  onStyleChange: (path: string, style: ElementStyle) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  const isMultiline = value.length > 60 || value.includes('\n');

  const top = Math.min(rect.bottom + 8, window.innerHeight - 220);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 340));

  const opacityPct = Math.round((elementStyle?.backgroundOpacity ?? 1) * 100);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] bg-[#1e1e22] border border-[#3a3a3e] rounded-xl shadow-2xl p-3 w-[336px]"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] text-muted-foreground mb-2 font-mono">{path}</p>
        {isMultiline ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={3}
            className="bg-[#0f0f12] border-[#2a2a2e] text-sm w-full mb-2 resize-none"
          />
        ) : (
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="bg-[#0f0f12] border-[#2a2a2e] text-sm h-8 w-full mb-2"
          />
        )}
        {/* Row 1: text color + font size */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] text-gray-500 w-10 shrink-0">Texto</span>
          <input
            type="color"
            value={elementStyle?.color || computedColor || '#ffffff'}
            onChange={(e) => onStyleChange(path, { ...elementStyle, color: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer p-0 border border-[#3a3a3e] bg-transparent"
            title="Cor do texto"
          />
          <div className="w-px h-4 bg-[#3a3a3e]" />
          <button
            onClick={() => onStyleChange(path, { ...elementStyle, fontSize: Math.max(0.5, (elementStyle?.fontSize ?? 1) - 0.1) })}
            className="w-6 h-6 text-[10px] bg-[#2a2a2e] rounded hover:bg-[#3a3a3e] text-white flex items-center justify-center"
            title="Diminuir texto"
          >A-</button>
          <button
            onClick={() => onStyleChange(path, { ...elementStyle, fontSize: Math.min(3, (elementStyle?.fontSize ?? 1) + 0.1) })}
            className="w-6 h-6 text-[12px] bg-[#2a2a2e] rounded hover:bg-[#3a3a3e] text-white flex items-center justify-center font-bold"
            title="Aumentar texto"
          >A+</button>
          <span className="text-[10px] text-gray-600 ml-1">{Math.round((elementStyle?.fontSize ?? 1) * 100)}%</span>
        </div>
        {/* Row 2: background + opacity */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] text-gray-500 w-10 shrink-0">Fundo</span>
          <input
            type="color"
            value={elementStyle?.background || computedBg || '#000000'}
            onChange={(e) => onStyleChange(path, { ...elementStyle, background: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer p-0 border border-[#3a3a3e] bg-transparent"
            title="Cor de fundo"
          />
          <div className="w-px h-4 bg-[#3a3a3e]" />
          <span className="text-[10px] text-gray-500 shrink-0">Opac</span>
          <input
            type="range"
            min={0} max={100}
            value={opacityPct}
            onChange={(e) => onStyleChange(path, { ...elementStyle, backgroundOpacity: Number(e.target.value) / 100 })}
            className="flex-1 h-1 accent-yellow-400"
            title="Opacidade"
          />
          <span className="text-[10px] text-gray-600 w-7 text-right">{opacityPct}%</span>
        </div>
        {/* Row 3: reset + save */}
        <div className="flex items-center gap-1.5">
          {elementStyle && Object.keys(elementStyle).length > 0 && (
            <button
              onClick={() => onStyleChange(path, {})}
              className="text-[10px] text-red-400 hover:text-red-300 px-1"
              title="Resetar estilos"
            >↺ reset</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-[11px] text-gray-500 hover:text-white px-1">✕</button>
          <button
            onClick={() => { onSave(path, text); onClose(); }}
            className="text-[11px] bg-yellow-400 text-black font-bold px-2.5 py-0.5 rounded"
          >✓ Salvar</button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Floating image editor ────────────────────────────────────────────────────
function FloatingImageEditor({
  path,
  currentUrl,
  rect,
  onUpload,
  onDelete,
  onClose,
  projectId,
}: {
  path: string;
  currentUrl: string;
  rect: DOMRect;
  onUpload: (path: string, url: string) => void;
  onDelete: (path: string) => void;
  onClose: () => void;
  projectId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const top = Math.min(rect.bottom + 8, window.innerHeight - 180);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 280));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { blob, ext, contentType } = await convertToWebP(file);
      const storagePath = `projects/${projectId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("project-media")
        .upload(storagePath, blob, { upsert: true, contentType });
      if (error) throw new Error(error.message);
      const { data: { publicUrl } } = supabase.storage.from("project-media").getPublicUrl(storagePath);
      onUpload(path, publicUrl);
      toast.success("Imagem trocada!");
      onClose();
    } catch (err) {
      toast.error("Erro no upload: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] bg-[#1e1e22] border border-[#3a3a3e] rounded-xl shadow-2xl p-3 w-64"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] text-muted-foreground mb-2 font-mono">{path}</p>
        {currentUrl && (
          <div className="rounded-lg overflow-hidden h-20 bg-[#0f0f12] mb-2">
            <img src={currentUrl} className="w-full h-full object-cover" alt="" />
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-1.5">
          <button
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex-1 text-xs bg-[#2a2a2e] hover:bg-[#3a3a3e] disabled:opacity-50 text-white rounded-lg h-8 flex items-center justify-center gap-1.5 transition-colors"
          >
            {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
            {uploading ? "Enviando..." : "Trocar"}
          </button>
          {currentUrl && (
            <button
              onClick={() => { onDelete(path); onClose(); }}
              className="text-xs bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-lg h-8 px-2.5 flex items-center gap-1 transition-colors"
              title="Remover imagem"
            >
              <X className="w-3 h-3" /> Deletar
            </button>
          )}
        </div>
        <button onClick={onClose} className="absolute top-2 right-2 text-[11px] text-gray-500 hover:text-white px-1">✕</button>
      </div>
    </>,
    document.body
  );
}

// ─── Section panel ─────────────────────────────────────────────────────────────
function SectionPanel({
  section,
  data,
  onUpdate,
  projectId,
  isActive,
}: {
  section: SectionConfig;
  data: LandingPageData;
  onUpdate: (updated: LandingPageData) => void;
  projectId: string;
  isActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [isActive]);

  const set = (path: string, value: unknown) => {
    // Deep clone and set by path (dot notation)
    const clone = JSON.parse(JSON.stringify(data)) as LandingPageData;
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    onUpdate(clone);
  };

  const renderFields = () => {
    switch (section.key) {
      case "hero": {
        const h = data.hero;
        return (
          <div className="space-y-3">
            <EditableField label="Badge" value={h.badge} onChange={(v) => set("hero.badge", v)} />
            <EditableField label="Título" value={h.title} onChange={(v) => set("hero.title", v)} multiline />
            <EditableField label="Destaque no título (opcional)" value={h.titleHighlight} onChange={(v) => set("hero.titleHighlight", v)} />
            <EditableField label="Subtítulo" value={h.subtitle} onChange={(v) => set("hero.subtitle", v)} multiline />
            <EditableField label="Texto do botão CTA" value={h.ctaText} onChange={(v) => set("hero.ctaText", v)} />
            <ImageUploadField label="Imagem de fundo" value={h.bgImage || ""} onChange={(v) => set("hero.bgImage", v)} projectId={projectId} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Opacidade do overlay ({Math.round((h.bgOpacity ?? 0.65) * 100)}%)</Label>
              <input type="range" min="0" max="100" value={Math.round((h.bgOpacity ?? 0.65) * 100)}
                onChange={(e) => set("hero.bgOpacity", parseInt(e.target.value) / 100)}
                className="w-full accent-yellow-400" />
            </div>
          </div>
        );
      }
      case "location": {
        const l = data.location;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={l.title} onChange={(v) => set("location.title", v)} />
            <EditableField label="Descrição" value={l.description} onChange={(v) => set("location.description", v)} multiline />
            {l.highlights.map((h, i) => (
              <EditableField
                key={i}
                label={`Destaque ${i + 1}`}
                value={h}
                onChange={(v) => {
                  const arr = [...l.highlights];
                  arr[i] = v;
                  set("location.highlights", arr);
                }}
              />
            ))}
          </div>
        );
      }
      case "features": {
        return (
          <div className="space-y-4">
            {data.features.map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Ícone (emoji)" value={f.icon} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], icon: v }; set("features", arr);
                }} />
                <EditableField label="Rótulo" value={f.label} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], label: v }; set("features", arr);
                }} />
                <EditableField label="Valor" value={f.value} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], value: v }; set("features", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "audience": {
        return (
          <div className="space-y-4">
            {data.audience.map((a, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Título" value={a.title} onChange={(v) => {
                  const arr = [...data.audience]; arr[i] = { ...arr[i], title: v }; set("audience", arr);
                }} />
                <EditableField label="Descrição" value={a.description} onChange={(v) => {
                  const arr = [...data.audience]; arr[i] = { ...arr[i], description: v }; set("audience", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "urgency": {
        const u = data.urgency;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={u.title} onChange={(v) => set("urgency.title", v)} />
            <EditableField label="Descrição" value={u.description} onChange={(v) => set("urgency.description", v)} multiline />
            <EditableField label="Destaque (ex: Apenas 8 unidades)" value={u.highlight} onChange={(v) => set("urgency.highlight", v)} />
          </div>
        );
      }
      case "benefits": {
        return (
          <div className="space-y-4">
            {data.benefits.map((b, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Ícone (emoji)" value={b.icon} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], icon: v }; set("benefits", arr);
                }} />
                <EditableField label="Título" value={b.title} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], title: v }; set("benefits", arr);
                }} />
                <EditableField label="Descrição" value={b.description} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], description: v }; set("benefits", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "cta": {
        const c = data.cta;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={c.title} onChange={(v) => set("cta.title", v)} />
            <EditableField label="Subtítulo" value={c.subtitle} onChange={(v) => set("cta.subtitle", v)} multiline />
            <EditableField label="Texto do botão" value={c.buttonText} onChange={(v) => set("cta.buttonText", v)} />
            <ImageUploadField label="Imagem de fundo" value={c.bgImage || ""} onChange={(v) => set("cta.bgImage", v)} projectId={projectId} />
          </div>
        );
      }
      case "form": {
        const f = data.form;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={f.title} onChange={(v) => set("form.title", v)} />
            <EditableField label="Subtítulo" value={f.subtitle} onChange={(v) => set("form.subtitle", v)} />
            <EditableField label="Texto do botão" value={f.buttonText} onChange={(v) => set("form.buttonText", v)} />
            <EditableField label="Título do agradecimento" value={f.thankYouTitle} onChange={(v) => set("form.thankYouTitle", v)} />
            <EditableField label="Mensagem de agradecimento" value={f.thankYouMessage} onChange={(v) => set("form.thankYouMessage", v)} multiline />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div ref={panelRef} className={cn("border rounded-lg overflow-hidden", isActive ? "border-yellow-400/60" : "border-[#2a2a2e]")}>
      <button
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-[#2a2a2e] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <span>{section.icon}</span>
          {section.label}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 bg-[#1a1a1e] border-t border-[#2a2a2e]">{renderFields()}</div>}
    </div>
  );
}

// ─── Default LP data (preview fallback when no AI data) ──────────────────────
function buildDefaultLp(project: Project): LandingPageData {
  const isRenting = project.status === "renting";
  return {
    theme: { primaryColor: "#FFFF00", accentColor: "#facc15", bgColor: "#0f0f12", textColor: "#ffffff", fontFamily: "Inter", heroStyle: "dark-overlay" },
    hero: { badge: isRenting ? "Disponível para Locação" : "Novo Empreendimento", title: project.hero_title || project.name, titleHighlight: "", subtitle: project.hero_subtitle || `${project.city} — ${project.description || ""}`, ctaText: isRenting ? "Quero agendar uma visita" : "Quero mais informações" },
    location: { title: `Localização estratégica em ${project.city}`, description: `${project.name} está localizado em uma região privilegiada de ${project.city}.`, highlights: ["Fácil acesso", "Bem localizado", "Região valorizada", "Infraestrutura completa"] },
    features: [{ icon: "📍", label: "Cidade", value: project.city }, { icon: "⭐", label: "Status", value: isRenting ? "Para Locação" : "Disponível" }],
    audience: [{ title: "Quem busca praticidade", description: "Imóvel com localização e estrutura ideais" }, { title: "Famílias em crescimento", description: "Espaço e segurança para viver bem" }, { title: "Investidores inteligentes", description: "Valorização garantida na melhor região" }, { title: "Quem quer conforto", description: "Acabamento e infraestrutura de alto padrão" }],
    urgency: { type: "opportunity", title: "Aproveite esta oportunidade", description: "Entre em contato agora e garanta as melhores condições.", highlight: "Disponibilidade limitada" },
    benefits: [{ icon: "📋", title: "Informações completas", description: "Receba todos os detalhes" }, { icon: "🎯", title: "Atendimento prioritário", description: "Fale diretamente com o corretor" }, { icon: "📅", title: "Agende uma visita", description: "Conheça o imóvel pessoalmente" }, { icon: "💬", title: "Tire suas dúvidas", description: "Estamos prontos para te atender" }],
    cta: { title: "Dê o próximo passo", subtitle: "Entre em contato e receba todas as informações.", buttonText: "Tenho interesse" },
    form: { title: "Tenho interesse", subtitle: "Preencha seus dados e entraremos em contato.", buttonText: "Enviar", thankYouTitle: "Recebemos seu cadastro!", thankYouMessage: "Em breve um corretor entrará em contato. Fique de olho no WhatsApp!" },
    floatingButtonText: "Quero mais informações",
    footer: { disclaimer: "Imagens meramente ilustrativas. Material de divulgação em conformidade com a legislação vigente." },
  };
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function ProjectEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { role, brokerId, isLoading: roleLoading } = useUserRole();

  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [lpData, setLpData] = useState<LandingPageData | null>(null);
  const [lpHistory, setLpHistory] = useState<LandingPageData[]>([]);
  const [hasAiData, setHasAiData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lpStatus, setLpStatus] = useState<'draft' | 'published'>('draft');
  const [regenerating, setRegenerating] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(true);

  // Inline editing state
  const [activeEdit, setActiveEdit] = useState<{
    path: string;
    value: string;
    rect: DOMRect;
    type: 'text' | 'image';
    computedColor?: string;
    computedBg?: string;
  } | null>(null);

  // Persist data directly to DB (fire-and-forget)
  const persistNow = (data: LandingPageData) => {
    const proj = projectRef.current;
    console.log("[persistNow] proj:", proj?.id, "| hero.badge:", (data as any).hero?.badge);
    if (!proj) { console.warn("[persistNow] ABORTED — projectRef.current is null"); return; }
    (supabase.from("projects") as any)
      .update({ landing_page_data: data })
      .eq("id", proj.id)
      .then(({ error, data: result }: { error: Error | null; data: any }) => {
        if (error) {
          console.error("[persistNow] SUPABASE ERROR:", error);
        } else {
          console.log("[persistNow] OK — rows updated:", result);
        }
      });
  };

  const handleLpUpdate = (path: string, value: string) => {
    const prev = lpDataRef.current;
    console.log("[handleLpUpdate] path:", path, "| value:", value, "| prev exists:", !!prev);
    if (!prev) return;
    const clone = JSON.parse(JSON.stringify(prev)) as LandingPageData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = clone;
    const parts = path.split('.');
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    lpDataRef.current = clone; // sync ref immediately so save() never reads stale data
    setLpData(clone);
    persistNow(clone);
  };

  const handleImageDelete = (path: string) => {
    const prev = lpDataRef.current;
    if (!prev) return;
    const clone = JSON.parse(JSON.stringify(prev)) as LandingPageData;
    const parts = path.split('.');
    if (parts[0] === 'gallery' && parts.length === 2) {
      const idx = parseInt(parts[1]);
      if (!isNaN(idx)) clone.gallery = clone.gallery?.filter((_, i) => i !== idx);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = clone;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = '';
    }
    lpDataRef.current = clone;
    setLpData(clone);
    persistNow(clone);
  };

  const handleDeleteItem = (arrayPath: string, index: number) => {
    const prev = lpDataRef.current;
    if (!prev) return;
    const clone = JSON.parse(JSON.stringify(prev)) as LandingPageData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = clone;
    const parts = arrayPath.split('.');
    for (const part of parts) obj = obj[part];
    (obj as unknown[]).splice(index, 1);
    lpDataRef.current = clone;
    setLpData(clone);
    persistNow(clone);
  };

  const handleStyleUpdate = (path: string, style: ElementStyle) => {
    const prev = lpDataRef.current;
    if (!prev) return;
    const clone = {
      ...prev,
      elementStyles: { ...(prev.elementStyles ?? {}), [path]: style },
    } as LandingPageData;
    lpDataRef.current = clone;
    setLpData(clone);
    persistNow(clone);
  };

  const rgbToHex = (rgb: string): string => {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    let target = e.target as HTMLElement | null;
    while (target) {
      const path = target.dataset?.lpPath;
      if (path) {
        const rect = target.getBoundingClientRect();
        const type = (target.dataset?.lpType as 'image') ?? 'text';
        const value = type === 'image'
          ? (target.tagName === 'IMG' ? (target as HTMLImageElement).src : '')
          : target.textContent?.trim() || '';
        const cs = window.getComputedStyle(target);
        const computedColor = rgbToHex(cs.color);
        const computedBg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
          ? rgbToHex(cs.backgroundColor)
          : '#000000';
        setActiveEdit({ path, value, rect, type, computedColor, computedBg });
        return;
      }
      target = target.parentElement;
    }
  };

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  // Copy URL
  const [copied, setCopied] = useState(false);

  // Auto-save
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);
  // Always-current ref — eliminates stale closure issues in save/auto-save
  const lpDataRef = useRef<LandingPageData | null>(null);
  const projectRef = useRef<Project | null>(null);

  useEffect(() => { lpDataRef.current = lpData; }, [lpData]);
  useEffect(() => { projectRef.current = project; }, [project]);

  useEffect(() => {
    if (projectId) loadEditor();
  }, [projectId]);

  // Auto-save fallback: covers left-panel edits (gallery, theme, etc.)
  // No cleanup return — timer fires even if user navigates away before 1.5s
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (!lpData || !project) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaving(true);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveTimer.current = null;
      setAutoSaving(false);
      const data = lpDataRef.current;
      const proj = projectRef.current;
      if (!data || !proj) return;
      (supabase.from("projects") as any)
        .update({ landing_page_data: data })
        .eq("id", proj.id)
        .then(({ error }: { error: Error | null }) => {
          if (error) console.error("[auto-save]", error);
        });
    }, 1500);
    // intentionally no cleanup — do NOT cancel on unmount so navigation doesn't lose data
  }, [lpData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadEditor = async () => {
    try {
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      const typedProject = projectData as ProjectRecord | null;

      if (!typedProject) {
        toast.error("Projeto não encontrado");
        navigate(-1);
        return;
      }
      setProject(typedProject as Project);
      setLpStatus(typedProject.landing_page_status || 'draft');
      if (typedProject.landing_page_data) {
        setLpData(typedProject.landing_page_data);
        setHasAiData(true);
      } else {
        setLpData(buildDefaultLp(typedProject as Project));
      }

      // Load broker via broker_projects — doesn't depend on useUserRole timing
      const { data: bpData } = await (supabase
        .from("broker_projects" as any)
        .select("broker_id, broker:brokers(id, name, slug)")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle());
      if (bpData?.broker) setBroker(bpData.broker as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const publicUrl =
    project && broker
      ? `${window.location.origin}/${project.city_slug}/${project.slug}/${broker.slug}`
      : "";

  const previewUrl = project
    ? `${window.location.origin}/preview/${project.id}`
    : "";

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async (targetStatus: 'draft' | 'published') => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    const currentData = lpDataRef.current;
    const currentProject = projectRef.current;
    console.log("[save] status:", targetStatus, "| project:", currentProject?.id, "| data exists:", !!currentData, "| hero.badge:", (currentData as any)?.hero?.badge);
    if (!currentData || !currentProject) {
      toast.error("Dados não carregados ainda.");
      return;
    }
    setSaving(true);
    try {
      const { error, data: result, status, statusText } = await (supabase
        .from("projects") as any)
        .update({ landing_page_data: currentData, landing_page_status: targetStatus })
        .eq("id", currentProject.id)
        .select();
      console.log("[save] response — status:", status, statusText, "| error:", error, "| result:", result);
      if (error) throw error;
      setLpStatus(targetStatus);
      toast.success(targetStatus === 'published' ? "Landing page publicada!" : "Rascunho salvo!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[save] CATCH:", msg);
      toast.error("Erro ao salvar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const pushToHistory = (data: LandingPageData) =>
    setLpHistory((prev) => [data, ...prev].slice(0, 10));

  const handleUndo = () => {
    if (lpHistory.length === 0) return;
    setLpData(lpHistory[0]);
    setLpHistory((prev) => prev.slice(1));
    toast.success("Versão anterior restaurada");
  };

  const regenerate = async () => {
    if (!project) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      // Pass scraped_images from DB or fall back to existing gallery
      const projectWithImages = {
        ...project,
        scraped_images: project.scraped_images?.length
          ? project.scraped_images
          : (lpData?.gallery ?? []),
      };

      const res = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { project: projectWithImages },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);

      const wasFirst = !lpData;
      if (lpData) pushToHistory(lpData);
      setLpData(res.data.data);
      setHasAiData(true);
      // Auto-publish on first generation so the link works immediately
      if (wasFirst) {
        await (supabase.from("projects") as any)
          .update({ landing_page_data: res.data.data, landing_page_status: 'published' })
          .eq("id", project!.id);
        setLpStatus('published');
        toast.success("Landing page gerada e publicada!");
      } else {
        toast.success("Landing page regenerada com sucesso!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro: " + msg);
    } finally {
      setRegenerating(false);
    }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !lpData || !project) return;

    // Pass current chat history (before new user message) for context
    const history = chatMessages;
    const newMessages: ChatMessage[] = [...history, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          project,
          chatMessage: msg,
          existingData: lpData,
          chatHistory: history, // full conversation context
        },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);

      const updated = res.data.data as LandingPageData;
      const aiMessage: string = res.data.message || "Alterações aplicadas.";

      if (lpData) pushToHistory(lpData);
      setLpData(updated);
      lpDataRef.current = updated;

      // Edge function already saved — no extra round trip needed

      setChatMessages([
        ...newMessages,
        { role: "assistant", content: aiMessage },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setChatMessages([...newMessages, { role: "assistant", content: `Erro: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen bg-[#0f0f12] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e] bg-[#1e1e22]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-[#2a2a2e] text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">{project.name}</h1>
            <p className="text-xs text-muted-foreground">Editor de Landing Page</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lpHistory.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              title={`Voltar versão anterior (${lpHistory.length} versão${lpHistory.length > 1 ? "ões" : ""})`}
              className="text-xs hover:bg-[#2a2a2e] gap-1 text-amber-400 hover:text-amber-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="tabular-nums">{lpHistory.length}</span>
            </Button>
          )}
          {publicUrl && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyUrl}
                className="text-xs hover:bg-[#2a2a2e] gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(publicUrl, "_blank")}
                className="text-xs hover:bg-[#2a2a2e] gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs hover:bg-[#2a2a2e] gap-1"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Ocultar" : "Preview"}
          </Button>

          {/* Status badge + auto-save indicator */}
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
            lpStatus === 'published'
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-slate-500/10 text-slate-400 border-slate-500/30"
          )}>
            {lpStatus === 'published' ? "Publicada" : "Rascunho"}
          </span>
          {autoSaving && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <RefreshCw className="w-3 h-3 animate-spin" /> salvando...
            </span>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => save('draft')}
            disabled={saving}
            className="border border-[#3a3a3e] text-muted-foreground hover:text-foreground hover:bg-[#2a2a2e] text-xs gap-1"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Rascunho
          </Button>

          <Button
            size="sm"
            onClick={() => save('published')}
            disabled={saving}
            className="bg-[#FFFF00] text-black hover:brightness-110 text-xs gap-1"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div
          className={cn(
            "flex flex-col border-r border-[#2a2a2e] bg-[#1e1e22]",
            showPreview ? "w-80" : "w-full max-w-xl"
          )}
        >
          <Tabs defaultValue="edit" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-3 mt-3 shrink-0 bg-[#2a2a2e]">
              <TabsTrigger value="edit" className="flex-1 text-xs gap-1">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 text-xs gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Chat IA
              </TabsTrigger>
            </TabsList>

            {/* Edit tab */}
            <TabsContent value="edit" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {!hasAiData && (
                    <div className="text-center py-6 space-y-3 border border-dashed border-[#3a3a3e] rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Gere com IA para personalizar os textos automaticamente.
                      </p>
                      <Button
                        onClick={regenerate}
                        disabled={regenerating}
                        className="bg-[#FFFF00] text-black hover:brightness-110 text-xs gap-1"
                      >
                        {regenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Gerar com IA
                      </Button>
                    </div>
                  )}
                  {lpData && (
                    <>
                      {/* Gallery images */}
                      {lpData.gallery && lpData.gallery.length > 0 && (
                        <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <GalleryHorizontal className="w-3.5 h-3.5" /> Galeria ({lpData.gallery.length} fotos)
                            </p>
                            <button
                              onClick={() => setLpData(prev => prev ? { ...prev, gallery: [] } : prev)}
                              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Limpar tudo
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Clique no X para remover uma imagem da galeria.</p>
                          <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                            {lpData.gallery.map((img, i) => (
                              <div key={i} className="relative rounded-lg overflow-hidden aspect-square group">
                                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                                <button
                                  onClick={() => setLpData(prev => {
                                    if (!prev) return prev;
                                    const g = prev.gallery!.filter((_, idx) => idx !== i);
                                    return { ...prev, gallery: g };
                                  })}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Theme colors */}
                      {(() => {
                        const rt = resolveTheme(lpData.theme);
                        return (
                          <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Tema Visual
                              </p>
                              {lpData.theme.preset && (
                                <span className="text-[10px] text-muted-foreground bg-[#2a2a2e] px-2 py-0.5 rounded-full">
                                  {lpData.theme.preset}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Cor primária</Label>
                                <input
                                  type="color"
                                  value={rt.primaryColor || "#ffffff"}
                                  onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...resolveTheme(prev.theme), primaryColor: e.target.value, preset: undefined } } : prev)}
                                  className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Destaque</Label>
                                <input
                                  type="color"
                                  value={rt.accentColor || "#ffffff"}
                                  onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...resolveTheme(prev.theme), accentColor: e.target.value, preset: undefined } } : prev)}
                                  className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Fundo</Label>
                                <input
                                  type="color"
                                  value={rt.bgColor || "#0f0f12"}
                                  onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...resolveTheme(prev.theme), bgColor: e.target.value, preset: undefined } } : prev)}
                                  className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                                />
                              </div>
                            </div>
                            {/* Theme preset picker */}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Trocar preset</Label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {Object.entries(LANDING_THEMES).map(([name, t]) => (
                                  <button
                                    key={name}
                                    title={name}
                                    onClick={() => setLpData(prev => prev ? { ...prev, theme: { ...prev.theme, preset: name } } : prev)}
                                    className={cn(
                                      "h-6 rounded border-2 transition-all",
                                      lpData.theme.preset === name ? "border-primary scale-110" : "border-transparent hover:border-[#3a3a3e]"
                                    )}
                                    style={{ background: `linear-gradient(135deg, ${t.bgColor} 50%, ${t.primaryColor} 100%)` }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Floating button text */}
                      <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Botão Flutuante (Mobile)
                        </p>
                        <Input
                          value={lpData.floatingButtonText}
                          onChange={(e) => setLpData(prev => prev ? { ...prev, floatingButtonText: e.target.value } : prev)}
                          className="bg-[#0f0f12] border-[#2a2a2e] text-sm h-8"
                        />
                      </div>

                      {/* Footer disclaimer */}
                      <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Footer
                        </p>
                        <Textarea
                          value={lpData.footer.disclaimer}
                          onChange={(e) => setLpData(prev => prev ? { ...prev, footer: { ...prev.footer, disclaimer: e.target.value } } : prev)}
                          rows={2}
                          className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Chat tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="py-4 space-y-3">
                      <div className="text-center space-y-1">
                        <Sparkles className="w-7 h-7 text-primary mx-auto" />
                        <p className="text-sm font-semibold text-foreground">Editor com IA</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Edite algo específico ou peça um layout completamente novo.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-1">Edições cirúrgicas</p>
                        {[
                          "Deixe o título do hero mais impactante",
                          "Reescreva o CTA com mais urgência",
                          "Deixa a seção de urgência mais forte",
                          "Mude o foco para família com filhos",
                          "Deixe os textos mais curtos e diretos",
                        ].map((s) => (
                          <button key={s} onClick={() => setChatInput(s)}
                            className="w-full text-xs text-left px-3 py-2 rounded-lg bg-[#2a2a2e] hover:bg-[#3a3a3e] text-muted-foreground hover:text-foreground transition-colors">
                            ✏️ {s}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-1">Novo layout</p>
                        {[
                          "Gera uma versão completamente diferente",
                          "Cria um layout mais luxuoso e premium",
                          "Faz uma versão focada em investidores",
                          "Cria outro com tema claro e moderno",
                        ].map((s) => (
                          <button key={s} onClick={() => setChatInput(s)}
                            className="w-full text-xs text-left px-3 py-2 rounded-lg bg-[#2a2a2e] hover:bg-[#3a3a3e] text-muted-foreground hover:text-foreground transition-colors">
                            ✨ {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-black font-medium"
                          : "bg-[#2a2a2e] text-foreground"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#2a2a2e] rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Analisando e aplicando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat input */}
              <div className="p-3 border-t border-[#2a2a2e]">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="Ex: Deixe o hero mais sofisticado..."
                    className="bg-[#0f0f12] border-[#2a2a2e] text-xs h-8 flex-1"
                    disabled={chatLoading || !lpData}
                  />
                  <Button
                    size="sm"
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim() || !lpData}
                    className="bg-primary text-black hover:brightness-110 h-8 w-8 p-0 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {!hasAiData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gere a landing page primeiro para usar o chat.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT PANEL: PREVIEW ── */}
        {showPreview && (
          <div className="flex-1 bg-[#0f0f12] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2e] bg-[#1a1a1e]">
              <p className="text-xs text-muted-foreground">Preview da Landing Page</p>
              {publicUrl && (
                <button
                  onClick={() => window.open(publicUrl, "_blank")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir em nova aba
                </button>
              )}
            </div>
            {lpData && project ? (
              <div className="relative flex-1 overflow-hidden">
                <div
                  ref={previewContentRef}
                  className="absolute inset-0 overflow-y-scroll"
                  style={{ cursor: 'crosshair' }}
                  onClick={handlePreviewClick}
                >
                  <LandingPageRenderer lp={lpData} project={project} broker={broker} isPreview onDeleteItem={handleDeleteItem} />
                </div>
                {/* Floating editor popup */}
                {activeEdit && activeEdit.type === 'image' ? (
                  <FloatingImageEditor
                    path={activeEdit.path}
                    currentUrl={activeEdit.value}
                    rect={activeEdit.rect}
                    onUpload={handleLpUpdate}
                    onDelete={handleImageDelete}
                    onClose={() => setActiveEdit(null)}
                    projectId={projectId!}
                  />
                ) : activeEdit ? (
                  <FloatingTextEditor
                    path={activeEdit.path}
                    value={activeEdit.value}
                    rect={activeEdit.rect}
                    elementStyle={(lpData as any).elementStyles?.[activeEdit.path]}
                    computedColor={activeEdit.computedColor}
                    computedBg={activeEdit.computedBg}
                    onSave={handleLpUpdate}
                    onStyleChange={handleStyleUpdate}
                    onClose={() => setActiveEdit(null)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline preview component ─────────────────────────────────────────────────
function LandingPagePreview({
  data,
  project,
  broker,
  onUpdate,
}: {
  data: LandingPageData;
  project: Project;
  broker: BrokerInfo | null;
  onUpdate?: (updated: LandingPageData) => void;
}) {
  const theme = resolveTheme(data.theme);
  const upd = (patch: Partial<LandingPageData>) => onUpdate?.({ ...data, ...patch });
  const heroBg = data.hero.bgImage || project.main_image_url;
  const heroOpacity = data.hero.bgOpacity ?? 0.65;
  const primary = theme.primaryColor;
  const accent = theme.accentColor;
  const bg = theme.bgColor;
  const text = theme.textColor;
  const btnTxt = theme.buttonTextColor ?? "#000";
  const sectionAlt = theme.altBgColor ?? `color-mix(in srgb, ${bg} 85%, white 15%)`;

  return (
    <ScrollArea className="flex-1 h-full">
      <div style={{ fontFamily: `'${theme.fontFamily}', sans-serif`, backgroundColor: bg, color: text }}>

        {/* ── Hero ── */}
        <div
          className="relative flex flex-col items-center justify-center min-h-[320px] py-20 px-6 text-center overflow-hidden"
          style={{
            backgroundImage: heroBg ? `url(${heroBg})` : `linear-gradient(135deg, ${bg} 0%, ${accent}22 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {heroBg && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${heroOpacity})` }} />}
          {!heroBg && (
            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${bg} 40%, ${primary}18 100%)` }} />
          )}
          <div className="relative z-10 space-y-4 max-w-sm mx-auto">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
              style={{ backgroundColor: primary, color: btnTxt }}
            >
              <Zap className="w-3 h-3" />
              <EditableText value={data.hero.badge} onSave={(v) => upd({ hero: { ...data.hero, badge: v } })} />
            </span>
            <h1 className="text-2xl font-black leading-tight" style={{ color: heroBg ? "#fff" : text }}>
              {data.hero.titleHighlight ? (
                (() => {
                  const idx = data.hero.title.indexOf(data.hero.titleHighlight);
                  const titleColor = heroBg ? "#fff" : text;
                  if (idx === -1) return (
                    <>
                      <EditableText value={data.hero.title} onSave={(v) => upd({ hero: { ...data.hero, title: v } })} style={{ color: titleColor }} />
                      {" "}
                      <EditableText value={data.hero.titleHighlight} onSave={(v) => upd({ hero: { ...data.hero, titleHighlight: v } })} style={{ color: primary }} />
                    </>
                  );
                  return (
                    <>
                      <span style={{ color: titleColor }}>{data.hero.title.slice(0, idx)}</span>
                      <EditableText value={data.hero.titleHighlight} onSave={(v) => upd({ hero: { ...data.hero, titleHighlight: v } })} style={{ color: primary }} />
                      <span style={{ color: titleColor }}>{data.hero.title.slice(idx + data.hero.titleHighlight.length)}</span>
                    </>
                  );
                })()
              ) : (
                <EditableText value={data.hero.title} onSave={(v) => upd({ hero: { ...data.hero, title: v } })} style={{ color: heroBg ? "#fff" : text }} />
              )}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: heroBg ? "rgba(255,255,255,0.8)" : `${text}99` }}>
              <EditableText value={data.hero.subtitle} onSave={(v) => upd({ hero: { ...data.hero, subtitle: v } })} />
            </p>
            <button
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold shadow-lg hover:brightness-110 transition-all"
              style={{ backgroundColor: primary, color: btnTxt }}
            >
              <EditableText value={data.hero.ctaText} onSave={(v) => upd({ hero: { ...data.hero, ctaText: v } })} />
            </button>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="py-12 px-6" style={{ backgroundColor: sectionAlt }}>
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 shrink-0" style={{ color: primary }} />
              <h2 className="text-base font-bold" style={{ color: accent }}>
                <EditableText value={data.location.title} onSave={(v) => upd({ location: { ...data.location, title: v } })} />
              </h2>
            </div>
            <p className="text-xs leading-relaxed mb-6 opacity-70">
              <EditableText value={data.location.description} onSave={(v) => upd({ location: { ...data.location, description: v } })} />
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.location.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: `${primary}12`, border: `1px solid ${primary}25` }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: primary }} />
                  <EditableText value={h} onSave={(v) => {
                    const arr = [...data.location.highlights]; arr[i] = v;
                    upd({ location: { ...data.location, highlights: arr } });
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Features (Diferenciais) ── */}
        {data.features.length > 0 && (
          <div className="py-12 px-6" style={{ backgroundColor: `${accent}0a` }}>
            <div className="max-w-sm mx-auto">
              <h2 className="text-base font-bold text-center mb-6" style={{ color: text }}>
                Diferenciais
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {data.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center gap-2 p-3 rounded-2xl transition-all"
                    style={{ backgroundColor: `${bg}`, border: `1px solid ${primary}22`, boxShadow: `0 2px 12px ${primary}10` }}
                  >
                    <div className="text-2xl leading-none">
                      <DynamicIcon name={f.icon} className="w-6 h-6" style={{ color: primary }} />
                    </div>
                    <div className="text-[10px] opacity-55 leading-tight">
                      <EditableText value={f.label} onSave={(v) => {
                        const arr = [...data.features]; arr[i] = { ...arr[i], label: v };
                        upd({ features: arr });
                      }} />
                    </div>
                    <div className="text-xs font-bold leading-tight" style={{ color: accent }}>
                      <EditableText value={f.value} onSave={(v) => {
                        const arr = [...data.features]; arr[i] = { ...arr[i], value: v };
                        upd({ features: arr });
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Gallery ── */}
        {data.gallery && data.gallery.length > 0 && (
          <div className="py-10 px-4" style={{ backgroundColor: bg }}>
            <div className="max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 flex items-center gap-1.5">
                  <GalleryHorizontal className="w-3 h-3" /> Galeria de fotos
                </p>
                <span className="text-[10px] opacity-30">{data.gallery.length} fotos</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {data.gallery.slice(0, 6).map((img, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {i === 5 && data.gallery!.length > 6 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">+{data.gallery!.length - 6}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Audience ── */}
        {data.audience?.length > 0 && (
          <div className="py-12 px-6" style={{ backgroundColor: bg }}>
            <div className="max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <Users className="w-4 h-4" style={{ color: primary }} />
                <h2 className="text-base font-bold text-center">Esse imóvel é ideal para você se...</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {data.audience.map((a, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${primary}10 0%, ${accent}08 100%)`,
                      border: `1px solid ${primary}20`,
                    }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: accent }}>
                      <EditableText value={a.title} onSave={(v) => {
                        const arr = [...data.audience]; arr[i] = { ...arr[i], title: v };
                        upd({ audience: arr });
                      }} />
                    </p>
                    <p className="text-[10px] opacity-60 leading-relaxed">
                      <EditableText value={a.description} onSave={(v) => {
                        const arr = [...data.audience]; arr[i] = { ...arr[i], description: v };
                        upd({ audience: arr });
                      }} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Urgency ── */}
        {data.urgency && (
          <div
            className="py-12 px-6 text-center"
            style={{ background: `linear-gradient(135deg, ${primary}22 0%, ${accent}18 100%)` }}
          >
            <div className="max-w-sm mx-auto space-y-4">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${primary}30`, color: text, border: `1px solid ${primary}40` }}
              >
                <Zap className="w-3 h-3" style={{ color: primary }} />
                {data.urgency.type === "urgency" ? "Atenção" : data.urgency.type === "availability" ? "Disponibilidade" : "Oportunidade"}
              </div>
              <h2 className="text-lg font-black leading-tight">
                <EditableText value={data.urgency.title} onSave={(v) => upd({ urgency: { ...data.urgency, title: v } })} />
              </h2>
              <p className="text-xs opacity-70 leading-relaxed">
                <EditableText value={data.urgency.description} onSave={(v) => upd({ urgency: { ...data.urgency, description: v } })} />
              </p>
              <div
                className="inline-block px-8 py-3 rounded-2xl text-base font-black shadow-lg"
                style={{ backgroundColor: primary, color: btnTxt }}
              >
                <EditableText value={data.urgency.highlight} onSave={(v) => upd({ urgency: { ...data.urgency, highlight: v } })} />
              </div>
            </div>
          </div>
        )}

        {/* ── Benefits ── */}
        {data.benefits?.length > 0 && (
          <div className="py-12 px-6" style={{ backgroundColor: bg }}>
            <div className="max-w-sm mx-auto">
              <h2 className="text-base font-bold text-center mb-6">
                Ao se cadastrar, você recebe:
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {data.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}18` }}
                  >
                    <DynamicIcon name={b.icon} className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primary }} />
                    <div>
                      <p className="text-xs font-bold mb-0.5">
                        <EditableText value={b.title} onSave={(v) => {
                          const arr = [...data.benefits]; arr[i] = { ...arr[i], title: v };
                          upd({ benefits: arr });
                        }} />
                      </p>
                      <p className="text-[10px] opacity-55 leading-relaxed">
                        <EditableText value={b.description} onSave={(v) => {
                          const arr = [...data.benefits]; arr[i] = { ...arr[i], description: v };
                          upd({ benefits: arr });
                        }} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div
          className="relative py-14 px-6 text-center overflow-hidden"
          style={{
            backgroundImage: data.cta.bgImage ? `url(${data.cta.bgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            background: data.cta.bgImage
              ? undefined
              : `linear-gradient(135deg, ${bg} 0%, ${primary}20 50%, ${accent}15 100%)`,
          }}
        >
          {data.cta.bgImage && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.62)" }} />}
          <div className="relative z-10 max-w-sm mx-auto space-y-4">
            <h2 className="text-xl font-black leading-tight" style={{ color: data.cta.bgImage ? "#fff" : text }}>
              <EditableText value={data.cta.title} onSave={(v) => upd({ cta: { ...data.cta, title: v } })} />
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: data.cta.bgImage ? "rgba(255,255,255,0.75)" : `${text}99` }}>
              <EditableText value={data.cta.subtitle} onSave={(v) => upd({ cta: { ...data.cta, subtitle: v } })} />
            </p>
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-xl hover:brightness-110 transition-all"
              style={{ backgroundColor: primary, color: btnTxt }}
            >
              <EditableText value={data.cta.buttonText} onSave={(v) => upd({ cta: { ...data.cta, buttonText: v } })} />
            </button>
          </div>
        </div>

        {/* ── Form preview ── */}
        <div className="py-12 px-6" style={{ backgroundColor: `${accent}08` }}>
          <div className="max-w-xs mx-auto space-y-4">
            <h2 className="text-base font-bold text-center">
              <EditableText value={data.form.title} onSave={(v) => upd({ form: { ...data.form, title: v } })} />
            </h2>
            <p className="text-xs text-center opacity-60">
              <EditableText value={data.form.subtitle} onSave={(v) => upd({ form: { ...data.form, subtitle: v } })} />
            </p>
            <div className="space-y-2">
              {["Nome *", "WhatsApp *", "E-mail (opcional)"].map((p) => (
                <div
                  key={p}
                  className="px-4 py-2.5 rounded-xl text-xs opacity-40"
                  style={{ border: `1px solid ${primary}50`, backgroundColor: `${bg}` }}
                >
                  {p}
                </div>
              ))}
              <button
                className="w-full py-3 rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all"
                style={{ backgroundColor: primary, color: btnTxt }}
              >
                <EditableText value={data.form.buttonText} onSave={(v) => upd({ form: { ...data.form, buttonText: v } })} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="py-5 px-6 text-center text-[10px] opacity-40"
          style={{ borderTop: `1px solid ${primary}20` }}
        >
          <EditableText value={data.footer.disclaimer} onSave={(v) => upd({ footer: { disclaimer: v } })} />
        </div>
      </div>
    </ScrollArea>
  );
}
