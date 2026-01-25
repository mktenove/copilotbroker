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
      brokers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
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
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
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
          broker_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          inactivated_at: string | null
          inactivated_by: string | null
          inactivation_reason: string | null
          last_interaction_at: string | null
          lead_origin: string | null
          name: string
          notes: string | null
          project_id: string | null
          registered_at: string | null
          registered_by: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          broker_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inactivated_at?: string | null
          inactivated_by?: string | null
          inactivation_reason?: string | null
          last_interaction_at?: string | null
          lead_origin?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          registered_at?: string | null
          registered_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          broker_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inactivated_at?: string | null
          inactivated_by?: string | null
          inactivation_reason?: string | null
          last_interaction_at?: string | null
          lead_origin?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          registered_at?: string | null
          registered_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
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
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "broker"
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
      lead_status:
        | "new"
        | "info_sent"
        | "awaiting_docs"
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
      app_role: ["admin", "broker"],
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
      ],
      lead_status: [
        "new",
        "info_sent",
        "awaiting_docs",
        "docs_received",
        "registered",
        "inactive",
      ],
    },
  },
} as const
