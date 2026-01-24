export interface Project {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
  status: ProjectStatus;
  is_active: boolean;
  hero_title: string | null;
  hero_subtitle: string | null;
  features: ProjectFeatures | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'pre_launch' | 'launch' | 'selling' | 'sold_out';

export interface ProjectFeatures {
  lots_count?: number;
  min_lot_size?: number;
  amenities?: string[];
  highlights?: string[];
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { 
  label: string; 
  color: string; 
  bgColor: string 
}> = {
  pre_launch: { 
    label: 'Pré-Lançamento', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' 
  },
  launch: { 
    label: 'Lançamento', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
  },
  selling: { 
    label: 'Em Vendas', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
  },
  sold_out: { 
    label: 'Esgotado', 
    color: 'text-slate-600 dark:text-slate-400', 
    bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700' 
  },
};

export interface BrokerProject {
  id: string;
  broker_id: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  broker?: {
    id: string;
    name: string;
    slug: string;
  };
  project?: Project;
}
