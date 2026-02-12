export type DistributionStatus = 
  | 'atribuicao_inicial'
  | 'reassinado_timeout'
  | 'fallback_lider'
  | 'atendimento_iniciado';

export interface Roleta {
  id: string;
  nome: string;
  lider_id: string;
  tempo_reserva_minutos: number;
  ativa: boolean;
  ultimo_membro_ordem_atribuida: number;
  created_at: string;
  updated_at: string;
  // Relations
  lider?: {
    id: string;
    name: string;
  } | null;
  membros?: RoletaMembro[];
  empreendimentos?: RoletaEmpreendimento[];
}

export interface RoletaMembro {
  id: string;
  roleta_id: string;
  corretor_id: string;
  ordem: number;
  status_checkin: boolean;
  checkin_em: string | null;
  checkout_em: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  corretor?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface RoletaEmpreendimento {
  id: string;
  roleta_id: string;
  empreendimento_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  empreendimento?: {
    id: string;
    name: string;
    city: string;
  } | null;
}

export interface RoletaLog {
  id: string;
  roleta_id: string;
  lead_id: string | null;
  acao: string;
  de_corretor_id: string | null;
  para_corretor_id: string | null;
  motivo: string | null;
  executado_por_user_id: string | null;
  created_at: string;
  // Relations
  lead?: { name: string } | null;
  de_corretor?: { name: string } | null;
  para_corretor?: { name: string } | null;
}
