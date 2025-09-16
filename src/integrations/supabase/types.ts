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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_automations: {
        Row: {
          action_config: Json
          automation_type: string
          created_at: string
          failure_count: number | null
          id: string
          is_enabled: boolean | null
          success_count: number | null
          trigger_conditions: Json
          updated_at: string
        }
        Insert: {
          action_config: Json
          automation_type: string
          created_at?: string
          failure_count?: number | null
          id?: string
          is_enabled?: boolean | null
          success_count?: number | null
          trigger_conditions: Json
          updated_at?: string
        }
        Update: {
          action_config?: Json
          automation_type?: string
          created_at?: string
          failure_count?: number | null
          id?: string
          is_enabled?: boolean | null
          success_count?: number | null
          trigger_conditions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_data: Json | null
          conversation_type: string
          created_at: string
          id: string
          is_active: boolean | null
          messages: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context_data?: Json | null
          conversation_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          messages?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context_data?: Json | null
          conversation_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          messages?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          confidence_score: number | null
          contact_phone: string
          created_at: string
          id: string
          is_used: boolean | null
          message_id: number | null
          suggestion_content: Json
          suggestion_type: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          contact_phone: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          message_id?: number | null
          suggestion_content: Json
          suggestion_type: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          contact_phone?: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          message_id?: number | null
          suggestion_content?: Json
          suggestion_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_results: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          phone: string
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          phone: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          phone?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          delivered_count: number | null
          failed_count: number | null
          id: string
          message: string
          name: string
          response_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string
          target_contacts: string[]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          response_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_contacts?: string[]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          response_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_contacts?: string[]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_config: {
        Row: {
          api_token: string
          created_at: string
          id: string
          inquilinos_list_id: string
          proprietarios_list_id: string
          space_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_token: string
          created_at?: string
          id?: string
          inquilinos_list_id: string
          proprietarios_list_id: string
          space_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_token?: string
          created_at?: string
          id?: string
          inquilinos_list_id?: string
          proprietarios_list_id?: string
          space_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      clickup_integration: {
        Row: {
          clickup_list_id: string
          clickup_task_id: string
          created_at: string
          error_message: string | null
          id: string
          last_sync: string
          sync_status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          clickup_list_id: string
          clickup_task_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync?: string
          sync_status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          clickup_list_id?: string
          clickup_task_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync?: string
          sync_status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_contracts: {
        Row: {
          contact_id: string
          contract_number: string
          contract_type: string | null
          created_at: string
          id: string
          property_code: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          contract_number: string
          contract_type?: string | null
          created_at?: string
          id?: string
          property_code?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          contract_number?: string
          contract_type?: string | null
          created_at?: string
          id?: string
          property_code?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          contact_ids: string[]
          created_at: string
          description: string | null
          filters: Json | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_ids?: string[]
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          contact_ids?: string[]
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_type: Database["public"]["Enums"]["contact_type"] | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          onboarding_status: string | null
          phone: string
          rating: number | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          onboarding_status?: string | null
          phone: string
          rating?: number | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          onboarding_status?: string | null
          phone?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          created_at: string | null
          direction: string | null
          id: number
          is_template: boolean | null
          media_caption: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_type: string | null
          media_url: string | null
          raw: Json | null
          wa_from: string | null
          wa_message_id: string | null
          wa_phone_number_id: string | null
          wa_timestamp: string | null
          wa_to: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          direction?: string | null
          id?: number
          is_template?: boolean | null
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          raw?: Json | null
          wa_from?: string | null
          wa_message_id?: string | null
          wa_phone_number_id?: string | null
          wa_timestamp?: string | null
          wa_to?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          direction?: string | null
          id?: number
          is_template?: boolean | null
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          raw?: Json | null
          wa_from?: string | null
          wa_message_id?: string | null
          wa_phone_number_id?: string | null
          wa_timestamp?: string | null
          wa_to?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_log: {
        Row: {
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          order_index: number
          ticket_type: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          order_index: number
          ticket_type: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          ticket_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string
          contact_id: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          last_contact: string
          phone: string
          priority: string
          property_address: string | null
          property_code: string | null
          property_type: string | null
          source: string
          stage: string
          title: string
          type: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          last_contact?: string
          phone: string
          priority: string
          property_address?: string | null
          property_code?: string | null
          property_type?: string | null
          source?: string
          stage: string
          title: string
          type: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          last_contact?: string
          phone?: string
          priority?: string
          property_address?: string | null
          property_code?: string | null
          property_type?: string | null
          source?: string
          stage?: string
          title?: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          components: Json
          created_at: string
          id: string
          language: string
          status: string
          template_id: string
          template_name: string
          updated_at: string
        }
        Insert: {
          category: string
          components: Json
          created_at?: string
          id?: string
          language?: string
          status?: string
          template_id: string
          template_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          components?: Json
          created_at?: string
          id?: string
          language?: string
          status?: string
          template_id?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      contact_status: "ativo" | "inativo" | "bloqueado"
      contact_type: "proprietario" | "inquilino"
      contract_status: "ativo" | "encerrado" | "suspenso"
      user_role: "admin" | "user"
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
      contact_status: ["ativo", "inativo", "bloqueado"],
      contact_type: ["proprietario", "inquilino"],
      contract_status: ["ativo", "encerrado", "suspenso"],
      user_role: ["admin", "user"],
    },
  },
} as const
