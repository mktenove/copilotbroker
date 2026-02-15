export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broker_activity_logs: {
        Row: {
          activity_type: string
          broker_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          lead_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          broker_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          broker_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_activity_logs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_auto_message_rules: {
        Row: {
          broker_id: string
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          message_content: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_content: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_content?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_auto_message_rules_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_auto_message_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_projects: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_projects_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_sessions: {
        Row: {
          broker_id: string
          id: string
          ip_address: string | null
          last_activity_at: string
          logged_in_at: string
          login_method: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          broker_id: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          logged_in_at?: string
          login_method?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          broker_id?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          logged_in_at?: string
          login_method?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_sessions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_whatsapp_instances: {
        Row: {
          broker_id: string
          connected_at: string | null
          created_at: string | null
          daily_limit: number | null
          daily_sent_count: number | null
          hourly_limit: number | null
          hourly_sent_count: number | null
          id: string
          instance_name: string
          instance_token: string | null
          is_paused: boolean | null
          last_seen_at: string | null
          pause_reason: string | null
          phone_number: string | null
          risk_score: number | null
          status: string
          updated_at: string | null
          warmup_day: number | null
          warmup_stage: string | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          broker_id: string
          connected_at?: string | null
          created_at?: string | null
          daily_limit?: number | null
          daily_sent_count?: number | null
          hourly_limit?: number | null
          hourly_sent_count?: number | null
          id?: string
          instance_name: string
          instance_token?: string | null
          is_paused?: boolean | null
          last_seen_at?: string | null
          pause_reason?: string | null
          phone_number?: string | null
          risk_score?: number | null
          status?: string
          updated_at?: string | null
          warmup_day?: number | null
          warmup_stage?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          broker_id?: string
          connected_at?: string | null
          created_at?: string | null
          daily_limit?: number | null
          daily_sent_count?: number | null
          hourly_limit?: number | null
          hourly_sent_count?: number | null
          id?: string
          instance_name?: string
          instance_token?: string | null
          is_paused?: boolean | null
          last_seen_at?: string | null
          pause_reason?: string | null
          phone_number?: string | null
          risk_score?: number | null
          status?: string
          updated_at?: string | null
          warmup_day?: number | null
          warmup_stage?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_whatsapp_instances_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: true
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          lider_id: string | null
          name: string
          slug: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          lider_id?: string | null
          name: string
          slug: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          lider_id?: string | null
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brokers_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_steps: {
        Row: {
          campaign_id: string
          created_at: string
          delay_minutes: number
          id: string
          message_content: string
          send_if_replied: boolean
          step_order: number
          template_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delay_minutes?: number
          id?: string
          message_content: string
          send_if_replied?: boolean
          step_order?: number
          template_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          message_content?: string
          send_if_replied?: boolean
          step_order?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_whatsapp_config: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          instance_token: string
          phone_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          instance_token: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          instance_token?: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_attribution: {
        Row: {
          created_at: string
          id: string
          landing_page: string | null
          lead_id: string | null
          project_id: string | null
          referrer: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page?: string | null
          lead_id?: string | null
          project_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_page?: string | null
          lead_id?: string | null
          project_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attribution_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          document_type: string
          id: string
          is_received: boolean
          lead_id: string
          received_at: string | null
          received_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          is_received?: boolean
          lead_id: string
          received_at?: string | null
          received_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          is_received?: boolean
          lead_id?: string
          received_at?: string | null
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          broker_id: string | null
          channel: string | null
          created_at: string
          created_by: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          lead_id: string
          new_status: Database["public"]["Enums"]["lead_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["lead_status"] | null
        }
        Insert: {
          broker_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          lead_id: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Update: {
          broker_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          lead_id?: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atendimento_iniciado_em: string | null
          atribuido_em: string | null
          auto_first_message_at: string | null
          auto_first_message_sent: boolean | null
          broker_id: string | null
          comparecimento: boolean | null
          corretor_atribuido_id: string | null
          cpf: string | null
          created_at: string
          data_agendamento: string | null
          data_envio_proposta: string | null
          data_fechamento: string | null
          data_perda: string | null
          email: string | null
          etapa_perda: string | null
          id: string
          inactivated_at: string | null
          inactivated_by: string | null
          inactivation_reason: string | null
          last_interaction_at: string | null
          lead_origin: string | null
          lead_origin_detail: string | null
          motivo_atribuicao: string | null
          name: string
          notes: string | null
          project_id: string | null
          registered_at: string | null
          registered_by: string | null
          reserva_expira_em: string | null
          roleta_id: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          status_distribuicao:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          tipo_agendamento: string | null
          updated_at: string
          valor_final_venda: number | null
          valor_proposta: number | null
          whatsapp: string
        }
        Insert: {
          atendimento_iniciado_em?: string | null
          atribuido_em?: string | null
          auto_first_message_at?: string | null
          auto_first_message_sent?: boolean | null
          broker_id?: string | null
          comparecimento?: boolean | null
          corretor_atribuido_id?: string | null
          cpf?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_envio_proposta?: string | null
          data_fechamento?: string | null
          data_perda?: string | null
          email?: string | null
          etapa_perda?: string | null
          id?: string
          inactivated_at?: string | null
          inactivated_by?: string | null
          inactivation_reason?: string | null
          last_interaction_at?: string | null
          lead_origin?: string | null
          lead_origin_detail?: string | null
          motivo_atribuicao?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          registered_at?: string | null
          registered_by?: string | null
          reserva_expira_em?: string | null
          roleta_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          status_distribuicao?:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          tipo_agendamento?: string | null
          updated_at?: string
          valor_final_venda?: number | null
          valor_proposta?: number | null
          whatsapp: string
        }
        Update: {
          atendimento_iniciado_em?: string | null
          atribuido_em?: string | null
          auto_first_message_at?: string | null
          auto_first_message_sent?: boolean | null
          broker_id?: string | null
          comparecimento?: boolean | null
          corretor_atribuido_id?: string | null
          cpf?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_envio_proposta?: string | null
          data_fechamento?: string | null
          data_perda?: string | null
          email?: string | null
          etapa_perda?: string | null
          id?: string
          inactivated_at?: string | null
          inactivated_by?: string | null
          inactivation_reason?: string | null
          last_interaction_at?: string | null
          lead_origin?: string | null
          lead_origin_detail?: string | null
          motivo_atribuicao?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          registered_at?: string | null
          registered_by?: string | null
          reserva_expira_em?: string | null
          roleta_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          status_distribuicao?:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          tipo_agendamento?: string | null
          updated_at?: string
          valor_final_venda?: number | null
          valor_proposta?: number | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_corretor_atribuido_id_fkey"
            columns: ["corretor_atribuido_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_roleta_id_fkey"
            columns: ["roleta_id"]
            isOneToOne: false
            referencedRelation: "roletas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          project_id: string | null
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          project_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          project_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          city: string
          city_slug: string | null
          created_at: string
          description: string | null
          features: Json | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          city: string
          city_slug?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          city?: string
          city_slug?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      propostas: {
        Row: {
          aprovada_em: string | null
          broker_id: string | null
          condicoes_especiais: string | null
          created_at: string | null
          created_by: string | null
          descricao_permuta: string | null
          enviada_vendedor_em: string | null
          forma_pagamento_entrada: string | null
          id: string
          lead_id: string
          motivo_rejeicao: string | null
          observacoes_corretor: string | null
          parcelamento: string | null
          permuta: boolean | null
          project_id: string | null
          rejeitada_em: string | null
          status_proposta: string | null
          unidade: string | null
          updated_at: string | null
          valor_entrada: number | null
          valor_proposta: number
        }
        Insert: {
          aprovada_em?: string | null
          broker_id?: string | null
          condicoes_especiais?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_permuta?: string | null
          enviada_vendedor_em?: string | null
          forma_pagamento_entrada?: string | null
          id?: string
          lead_id: string
          motivo_rejeicao?: string | null
          observacoes_corretor?: string | null
          parcelamento?: string | null
          permuta?: boolean | null
          project_id?: string | null
          rejeitada_em?: string | null
          status_proposta?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_entrada?: number | null
          valor_proposta: number
        }
        Update: {
          aprovada_em?: string | null
          broker_id?: string | null
          condicoes_especiais?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_permuta?: string | null
          enviada_vendedor_em?: string | null
          forma_pagamento_entrada?: string | null
          id?: string
          lead_id?: string
          motivo_rejeicao?: string | null
          observacoes_corretor?: string | null
          parcelamento?: string | null
          permuta?: boolean | null
          project_id?: string | null
          rejeitada_em?: string | null
          status_proposta?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_entrada?: number | null
          valor_proposta?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      roletas: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          lider_id: string
          nome: string
          tempo_reserva_minutos: number
          timeout_ativo: boolean
          ultimo_membro_ordem_atribuida: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          lider_id: string
          nome: string
          tempo_reserva_minutos?: number
          timeout_ativo?: boolean
          ultimo_membro_ordem_atribuida?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          lider_id?: string
          nome?: string
          tempo_reserva_minutos?: number
          timeout_ativo?: boolean
          ultimo_membro_ordem_atribuida?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roletas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      roletas_empreendimentos: {
        Row: {
          ativo: boolean
          created_at: string
          empreendimento_id: string
          id: string
          roleta_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empreendimento_id: string
          id?: string
          roleta_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empreendimento_id?: string
          id?: string
          roleta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roletas_empreendimentos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roletas_empreendimentos_roleta_id_fkey"
            columns: ["roleta_id"]
            isOneToOne: false
            referencedRelation: "roletas"
            referencedColumns: ["id"]
          },
        ]
      }
      roletas_log: {
        Row: {
          acao: string
          created_at: string
          de_corretor_id: string | null
          executado_por_user_id: string | null
          id: string
          lead_id: string | null
          motivo: string | null
          para_corretor_id: string | null
          roleta_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          de_corretor_id?: string | null
          executado_por_user_id?: string | null
          id?: string
          lead_id?: string | null
          motivo?: string | null
          para_corretor_id?: string | null
          roleta_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          de_corretor_id?: string | null
          executado_por_user_id?: string | null
          id?: string
          lead_id?: string | null
          motivo?: string | null
          para_corretor_id?: string | null
          roleta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roletas_log_de_corretor_id_fkey"
            columns: ["de_corretor_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roletas_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roletas_log_para_corretor_id_fkey"
            columns: ["para_corretor_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roletas_log_roleta_id_fkey"
            columns: ["roleta_id"]
            isOneToOne: false
            referencedRelation: "roletas"
            referencedColumns: ["id"]
          },
        ]
      }
      roletas_membros: {
        Row: {
          ativo: boolean
          checkin_em: string | null
          checkout_em: string | null
          corretor_id: string
          created_at: string
          id: string
          ordem: number
          roleta_id: string
          status_checkin: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          checkin_em?: string | null
          checkout_em?: string | null
          corretor_id: string
          created_at?: string
          id?: string
          ordem: number
          roleta_id: string
          status_checkin?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          checkin_em?: string | null
          checkout_em?: string | null
          corretor_id?: string
          created_at?: string
          id?: string
          ordem?: number
          roleta_id?: string
          status_checkin?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roletas_membros_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roletas_membros_roleta_id_fkey"
            columns: ["roleta_id"]
            isOneToOne: false
            referencedRelation: "roletas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          broker_id: string
          completed_at: string | null
          created_at: string | null
          custom_message: string | null
          failed_count: number | null
          id: string
          name: string
          project_id: string | null
          reply_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          target_status: string[] | null
          template_id: string | null
          total_leads: number | null
          updated_at: string | null
        }
        Insert: {
          broker_id: string
          completed_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          failed_count?: number | null
          id?: string
          name: string
          project_id?: string | null
          reply_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_status?: string[] | null
          template_id?: string | null
          total_leads?: number | null
          updated_at?: string | null
        }
        Update: {
          broker_id?: string
          completed_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          project_id?: string | null
          reply_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_status?: string[] | null
          template_id?: string | null
          total_leads?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_daily_stats: {
        Row: {
          broker_id: string
          date: string
          error_count: number | null
          failed_count: number | null
          id: string
          optout_count: number | null
          reply_count: number | null
          sent_count: number | null
        }
        Insert: {
          broker_id: string
          date: string
          error_count?: number | null
          failed_count?: number | null
          id?: string
          optout_count?: number | null
          reply_count?: number | null
          sent_count?: number | null
        }
        Update: {
          broker_id?: string
          date?: string
          error_count?: number | null
          failed_count?: number | null
          id?: string
          optout_count?: number | null
          reply_count?: number | null
          sent_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_daily_stats_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_queue: {
        Row: {
          attempts: number | null
          broker_id: string
          campaign_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          max_attempts: number | null
          message: string
          phone: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
          step_number: number | null
          uazapi_message_id: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          broker_id: string
          campaign_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          message: string
          phone: string
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          step_number?: number | null
          uazapi_message_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          broker_id?: string
          campaign_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          message?: string
          phone?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          step_number?: number | null
          uazapi_message_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_queue_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          broker_id: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          broker_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          broker_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_optouts: {
        Row: {
          created_at: string | null
          detected_keyword: string | null
          id: string
          phone: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          detected_keyword?: string | null
          id?: string
          phone: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          detected_keyword?: string | null
          id?: string
          phone?: string
          reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_broker_id: { Args: never; Returns: string }
      get_my_roleta_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_or_leader: { Args: { _user_id: string }; Returns: boolean }
      transfer_lead: {
        Args: { _lead_id: string; _new_broker_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "broker" | "leader"
      distribution_status:
        | "atribuicao_inicial"
        | "reassinado_timeout"
        | "fallback_lider"
        | "atendimento_iniciado"
      interaction_type:
        | "status_change"
        | "note_added"
        | "document_request"
        | "document_received"
        | "info_sent"
        | "contact_attempt"
        | "registration"
        | "origin_change"
        | "inactivation"
        | "notification"
        | "roleta_atribuicao"
        | "roleta_timeout"
        | "roleta_fallback"
        | "roleta_transferencia"
        | "atendimento_iniciado"
        | "agendamento_registrado"
        | "comparecimento_registrado"
        | "proposta_enviada"
        | "venda_confirmada"
        | "reagendamento"
        | "whatsapp_manual"
      lead_status:
        | "new"
        | "info_sent"
        | "awaiting_docs"
        | "scheduling"
        | "docs_received"
        | "registered"
        | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "broker", "leader"],
      distribution_status: [
        "atribuicao_inicial",
        "reassinado_timeout",
        "fallback_lider",
        "atendimento_iniciado",
      ],
      interaction_type: [
        "status_change",
        "note_added",
        "document_request",
        "document_received",
        "info_sent",
        "contact_attempt",
        "registration",
        "origin_change",
        "inactivation",
        "notification",
        "roleta_atribuicao",
        "roleta_timeout",
        "roleta_fallback",
        "roleta_transferencia",
        "atendimento_iniciado",
        "agendamento_registrado",
        "comparecimento_registrado",
        "proposta_enviada",
        "venda_confirmada",
        "reagendamento",
        "whatsapp_manual",
      ],
      lead_status: [
        "new",
        "info_sent",
        "awaiting_docs",
        "scheduling",
        "docs_received",
        "registered",
        "inactive",
      ],
    },
  },
} as const
