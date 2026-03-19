// WhatsApp Dispatcher Types

export type WhatsAppInstanceStatus = 'disconnected' | 'connecting' | 'connected' | 'qr_pending';
export type WarmupStage = 'new' | 'warming' | 'normal';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
export type QueueStatus = 'queued' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'paused_by_system';
export type TemplateCategory = 'geral' | 'follow_up' | 'info' | 'docs';

export interface BrokerWhatsAppInstance {
  id: string;
  broker_id: string;
  instance_name: string;
  instance_token: string | null;
  status: WhatsAppInstanceStatus;
  phone_number: string | null;
  last_seen_at: string | null;
  connected_at: string | null;
  risk_score: number;
  daily_sent_count: number;
  hourly_sent_count: number;
  warmup_stage: WarmupStage;
  warmup_day: number;
  hourly_limit: number;
  daily_limit: number;
  working_hours_start: string;
  working_hours_end: string;
  is_paused: boolean;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageTemplate {
  id: string;
  broker_id: string | null;
  name: string;
  content: string;
  category: TemplateCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppCampaign {
  id: string;
  broker_id: string;
  name: string;
  template_id: string | null;
  custom_message: string | null;
  target_status: string[];
  project_id: string | null;
  status: CampaignStatus;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  reply_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  template?: WhatsAppMessageTemplate;
  project?: { id: string; name: string };
  broker?: { id: string; name: string };
}

export interface WhatsAppMessageQueue {
  id: string;
  broker_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  phone: string;
  message: string;
  status: QueueStatus;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  uazapi_message_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  lead?: { id: string; name: string };
  campaign?: { id: string; name: string };
}

export interface WhatsAppOptout {
  id: string;
  phone: string;
  reason: string | null;
  detected_keyword: string | null;
  created_at: string;
}

export interface WhatsAppDailyStats {
  id: string;
  broker_id: string;
  date: string;
  sent_count: number;
  failed_count: number;
  reply_count: number;
  optout_count: number;
  error_count: number;
}

// UAZAPI Response Types
export interface UAZAPIInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
}

export interface UAZAPIQRCodeResponse {
  qrcode: string;
  base64?: string;
}

export interface UAZAPIStatusResponse {
  instance: {
    instanceName: string;
    state: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
}

export interface UAZAPISendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
  messageTimestamp: string;
  status: string;
}

// Warmup Schedule
export const WARMUP_SCHEDULE: Record<number, { dailyLimit: number; hourlyLimit: number }> = {
  1: { dailyLimit: 30, hourlyLimit: 15 },
  2: { dailyLimit: 30, hourlyLimit: 15 },
  3: { dailyLimit: 30, hourlyLimit: 15 },
  4: { dailyLimit: 60, hourlyLimit: 25 },
  5: { dailyLimit: 60, hourlyLimit: 25 },
  6: { dailyLimit: 60, hourlyLimit: 25 },
  7: { dailyLimit: 60, hourlyLimit: 25 },
  8: { dailyLimit: 100, hourlyLimit: 35 },
  9: { dailyLimit: 100, hourlyLimit: 35 },
  10: { dailyLimit: 100, hourlyLimit: 35 },
  11: { dailyLimit: 150, hourlyLimit: 45 },
  12: { dailyLimit: 150, hourlyLimit: 45 },
  13: { dailyLimit: 150, hourlyLimit: 45 },
  14: { dailyLimit: 150, hourlyLimit: 45 },
};

export const MAX_WARMUP_DAY = 14;
export const NORMAL_DAILY_LIMIT = 250;
export const NORMAL_HOURLY_LIMIT = 60;

// Opt-out Keywords
export const OPTOUT_KEYWORDS = [
  'pare', 'parar', 'sair', 'remover', 'cancelar',
  'spam', 'bloquear', 'não quero', 'nao quero',
  'stop', 'remove', 'unsubscribe'
];

// Get random interval between messages (60-240s + jitter)
export const getRandomInterval = (): number => {
  const base = Math.floor(Math.random() * 180) + 60; // 60-240s
  const jitter = Math.floor(Math.random() * 5); // 0-5s extra
  return (base + jitter) * 1000; // Convert to ms
};

// Campaign Step types
export interface CampaignStep {
  id: string;
  campaign_id: string;
  step_order: number;
  message_content: string;
  delay_minutes: number;
  template_id: string | null;
  created_at: string;
}

export interface CampaignStepInput {
  messageContent: string;
  delayMinutes: number;
  sendIfReplied?: boolean;
}

// Template variable replacements
export interface TemplateVariables {
  nome?: string;
  empreendimento?: string;
  corretor_nome?: string;
  cidade?: string;
  dormitorios?: string;
  piscina?: string;
  interesse?: string;
  tags?: string;
}

export const replaceTemplateVariables = (content: string, variables: TemplateVariables): string => {
  let result = content;
  if (variables.nome) result = result.replace(/{nome}/g, variables.nome);
  if (variables.empreendimento) result = result.replace(/{empreendimento}/g, variables.empreendimento);
  if (variables.corretor_nome) result = result.replace(/{corretor_nome}/g, variables.corretor_nome);
  if (variables.cidade) result = result.replace(/{cidade}/g, variables.cidade);
  if (variables.dormitorios) result = result.replace(/{dormitorios}/g, variables.dormitorios);
  if (variables.piscina) result = result.replace(/{piscina}/g, variables.piscina);
  if (variables.interesse) result = result.replace(/{interesse}/g, variables.interesse);
  if (variables.tags) result = result.replace(/{tags}/g, variables.tags);
  return result;
};

// Format phone to E.164
export const formatPhoneE164 = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) return `+${cleaned}`;
  if (cleaned.length === 11 || cleaned.length === 10) return `+55${cleaned}`;
  return `+${cleaned}`;
};

// Validate phone number
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};
