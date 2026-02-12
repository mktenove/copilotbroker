export type LeadStatus = 'new' | 'info_sent' | 'awaiting_docs' | 'docs_received' | 'registered' | 'inactive';

export type DistributionStatus = 'atribuicao_inicial' | 'reassinado_timeout' | 'fallback_lider' | 'atendimento_iniciado';

export type InteractionType = 
  | 'status_change'
  | 'note_added'
  | 'document_request'
  | 'document_received'
  | 'info_sent'
  | 'contact_attempt'
  | 'registration'
  | 'origin_change'
  | 'inactivation'
  | 'notification'
  | 'roleta_atribuicao'
  | 'roleta_timeout'
  | 'roleta_fallback'
  | 'roleta_transferencia'
  | 'atendimento_iniciado';

export interface CRMLead {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  notes: string | null;
  source: string;
  lead_origin: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
  registered_at: string | null;
  registered_by: string | null;
  inactivation_reason: string | null;
  inactivated_at: string | null;
  inactivated_by: string | null;
  broker_id: string | null;
  project_id: string | null;
  // Auto first message tracking
  auto_first_message_sent?: boolean;
  auto_first_message_at?: string | null;
  // Roleta / distribution fields
  roleta_id?: string | null;
  corretor_atribuido_id?: string | null;
  atribuido_em?: string | null;
  atendimento_iniciado_em?: string | null;
  reserva_expira_em?: string | null;
  status_distribuicao?: DistributionStatus | null;
  motivo_atribuicao?: string | null;
  // Relations
  broker?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
    city: string;
  } | null;
  // Attribution for checking origin type
  attribution?: {
    landing_page?: string;
  } | null;
}

// Motivos de inativação pré-definidos
export const INACTIVATION_REASONS = [
  { key: 'sem_interesse', label: 'Sem interesse', icon: '😐' },
  { key: 'nao_responde', label: 'Não responde', icon: '📵' },
  { key: 'comprou_outro', label: 'Comprou outro imóvel', icon: '🏠' },
  { key: 'sem_condicao_financeira', label: 'Sem condição financeira', icon: '💸' },
  { key: 'desistiu', label: 'Desistiu da compra', icon: '↩️' },
  { key: 'lead_duplicado', label: 'Lead duplicado', icon: '👥' },
  { key: 'dados_invalidos', label: 'Dados inválidos/falsos', icon: '⚠️' },
  { key: 'outro', label: 'Outro motivo', icon: '📝' },
] as const;

export const getInactivationReasonLabel = (key: string): string => {
  const reason = INACTIVATION_REASONS.find(r => r.key === key);
  return reason?.label || key;
};

// Origens pré-definidas para seleção manual (quando não há UTM)
export const LEAD_ORIGINS = [
  // Mídias pagas
  { key: 'meta_ads', label: 'Meta ADS' },
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'tiktok_ads', label: 'TikTok Ads' },
  { key: 'linkedin_ads', label: 'LinkedIn Ads' },
  // Orgânico
  { key: 'meta_organico', label: 'Meta Orgânico' },
  { key: 'google_organico', label: 'Google Orgânico' },
  // Outros canais
  { key: 'indicacao', label: 'Indicação' },
  { key: 'oferta_ativa', label: 'Oferta Ativa' },
  { key: 'plantao_enove', label: 'Plantão Enove' },
  { key: 'whatsapp_direto', label: 'WhatsApp Direto' },
  { key: 'outdoor_ooh', label: 'Outdoor/Mídia OOH' },
  { key: 'evento', label: 'Evento' },
  { key: 'radio_tv', label: 'Rádio/TV' },
  // Personalizado
  { key: 'outro', label: 'Outro (personalizado)' },
] as const;

// Tipo de origem para badges coloridos
export type OriginType = 'paid' | 'organic' | 'referral' | 'manual' | 'unknown';

// Detectar tipo de origem para estilização
export const getOriginType = (origin: string | null): OriginType => {
  if (!origin) return 'unknown';
  
  const lower = origin.toLowerCase();
  
  // Tráfego pago (inclui auto-detected de click IDs)
  if (lower.includes('cpc') || lower.includes('paid') || lower.includes('ads') || 
      lower.includes('cpm') || lower.includes('sponsored') || lower.includes('ppc') ||
      lower.includes('(auto)') || lower.includes('auto-detected')) {
    return 'paid';
  }
  
  // Orgânico
  if (lower.includes('organic') || lower.includes('orgânico') || lower.includes('organico')) {
    return 'organic';
  }
  
  // Referral
  if (lower.startsWith('referral:')) {
    return 'referral';
  }
  
  // Origens manuais pré-definidas
  if (LEAD_ORIGINS.some(o => o.key === origin)) {
    return 'manual';
  }
  
  return 'unknown';
};

// Cores por tipo de origem
export const ORIGIN_TYPE_COLORS: Record<OriginType, string> = {
  paid: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  organic: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  referral: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  manual: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  unknown: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
};

// Exibir label da origem
export const getOriginDisplayLabel = (origin: string | null): string => {
  if (!origin) return 'Não identificada';
  
  // Verificar se é uma das origens pré-definidas
  const predefined = LEAD_ORIGINS.find(o => o.key === origin);
  if (predefined) return predefined.label;
  
  // Caso contrário, é uma origem dinâmica do analytics - exibir como está
  return origin;
};

export interface LeadInteraction {
  id: string;
  lead_id: string;
  broker_id: string | null;
  interaction_type: InteractionType;
  channel: string | null;
  notes: string | null;
  old_status: LeadStatus | null;
  new_status: LeadStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface LeadDocument {
  id: string;
  lead_id: string;
  document_type: string;
  is_received: boolean;
  received_at: string | null;
  received_by: string | null;
  created_at: string;
}

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  new: {
    label: 'Novos Leads',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  info_sent: {
    label: 'Informações Enviadas',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30'
  },
  awaiting_docs: {
    label: 'Aguardando Dados',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10 border-yellow-400/30'
  },
  docs_received: {
    label: 'Dados Recebidos',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200'
  },
  registered: {
    label: 'Cadastrado no Ábaco',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 border-slate-300'
  },
  inactive: {
    label: 'Inativos',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200'
  }
};

export const DOCUMENT_TYPES = [
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'comprovante_renda', label: 'Comprovante de Renda' },
  { key: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { key: 'certidao_casamento', label: 'Certidão de Casamento' },
];

export const INTERACTION_CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'ligacao', label: 'Ligação' },
  { key: 'email', label: 'E-mail' },
  { key: 'presencial', label: 'Presencial' },
];

export type NoteCategory = 'contato' | 'interesse' | 'documentos' | 'financeiro';

export interface NoteTemplate {
  key: string;
  label: string;
  text: string;
  category: NoteCategory;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  // Contato
  { key: 'nao_atendeu', label: 'Não atendeu', text: 'Cliente não atendeu a ligação/mensagem', category: 'contato' },
  { key: 'retornar_depois', label: 'Retornar depois', text: 'Cliente pediu para retornar em outro momento', category: 'contato' },
  { key: 'sem_interesse', label: 'Sem interesse', text: 'Cliente informou que não tem interesse no momento', category: 'contato' },
  
  // Interesse
  { key: 'muito_interessado', label: 'Muito interessado', text: 'Cliente demonstrou alto interesse no empreendimento', category: 'interesse' },
  { key: 'quer_visitar', label: 'Quer visitar', text: 'Cliente solicitou visita ao local', category: 'interesse' },
  { key: 'comparando_opcoes', label: 'Comparando opções', text: 'Cliente está comparando com outros empreendimentos', category: 'interesse' },
  
  // Documentos
  { key: 'docs_incompletos', label: 'Docs incompletos', text: 'Documentos recebidos estão incompletos ou ilegíveis', category: 'documentos' },
  { key: 'aguardando_renda', label: 'Aguardando renda', text: 'Aguardando comprovante de renda atualizado', category: 'documentos' },
  
  // Financeiro
  { key: 'aprovado_credito', label: 'Crédito aprovado', text: 'Cliente teve crédito pré-aprovado', category: 'financeiro' },
  { key: 'analise_credito', label: 'Em análise', text: 'Documentos enviados para análise de crédito', category: 'financeiro' },
];

export const NOTE_CATEGORY_CONFIG: Record<NoteCategory, { label: string; color: string; bgColor: string }> = {
  contato: { label: 'Contato', color: 'text-slate-600', bgColor: 'bg-slate-100 hover:bg-slate-200' },
  interesse: { label: 'Interesse', color: 'text-emerald-600', bgColor: 'bg-emerald-100 hover:bg-emerald-200' },
  documentos: { label: 'Documentos', color: 'text-yellow-600', bgColor: 'bg-yellow-100 hover:bg-yellow-200' },
  financeiro: { label: 'Financeiro', color: 'text-blue-600', bgColor: 'bg-blue-100 hover:bg-blue-200' },
};
