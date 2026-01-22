export type LeadStatus = 'new' | 'info_sent' | 'awaiting_docs' | 'docs_received' | 'registered';

export type InteractionType = 
  | 'status_change'
  | 'note_added'
  | 'document_request'
  | 'document_received'
  | 'info_sent'
  | 'contact_attempt'
  | 'registration';

export interface CRMLead {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  notes: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
  registered_at: string | null;
  registered_by: string | null;
  broker_id: string | null;
  broker?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

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
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200'
  },
  awaiting_docs: {
    label: 'Aguardando Dados',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200'
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
