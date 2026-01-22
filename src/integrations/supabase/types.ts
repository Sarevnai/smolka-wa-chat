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
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          target_id: string
          target_table: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          target_id: string
          target_table: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string
          target_table?: string
          user_id?: string
        }
        Relationships: []
      }
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
      ai_behavior_config: {
        Row: {
          created_at: string | null
          essential_questions: Json | null
          functions: Json | null
          id: string
          reengagement_hours: number | null
          require_cpf_for_visit: boolean | null
          send_cold_leads: boolean | null
          updated_at: string | null
          visit_schedule: Json | null
        }
        Insert: {
          created_at?: string | null
          essential_questions?: Json | null
          functions?: Json | null
          id?: string
          reengagement_hours?: number | null
          require_cpf_for_visit?: boolean | null
          send_cold_leads?: boolean | null
          updated_at?: string | null
          visit_schedule?: Json | null
        }
        Update: {
          created_at?: string | null
          essential_questions?: Json | null
          functions?: Json | null
          id?: string
          reengagement_hours?: number | null
          require_cpf_for_visit?: boolean | null
          send_cold_leads?: boolean | null
          updated_at?: string | null
          visit_schedule?: Json | null
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
      ai_department_configs: {
        Row: {
          agent_name: string
          created_at: string | null
          custom_instructions: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          faqs: Json | null
          greeting_message: string | null
          id: string
          is_active: boolean | null
          limitations: Json | null
          qualification_focus: Json | null
          services: Json | null
          tone: string
          updated_at: string | null
        }
        Insert: {
          agent_name?: string
          created_at?: string | null
          custom_instructions?: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          faqs?: Json | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          limitations?: Json | null
          qualification_focus?: Json | null
          services?: Json | null
          tone?: string
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          custom_instructions?: string | null
          department_code?: Database["public"]["Enums"]["department_type"]
          faqs?: Json | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          limitations?: Json | null
          qualification_focus?: Json | null
          services?: Json | null
          tone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_flows: {
        Row: {
          created_at: string
          created_by: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          description: string | null
          edges: Json
          id: string
          is_active: boolean
          name: string
          nodes: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_code?: Database["public"]["Enums"]["department_type"]
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name: string
          nodes?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_code?: Database["public"]["Enums"]["department_type"]
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
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
      c2s_integration: {
        Row: {
          c2s_lead_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_data: Json | null
          sync_status: string
          synced_at: string | null
        }
        Insert: {
          c2s_lead_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_data?: Json | null
          sync_status?: string
          synced_at?: string | null
        }
        Update: {
          c2s_lead_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_data?: Json | null
          sync_status?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "c2s_integration_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "c2s_integration_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          department_code: string | null
          failed_count: number | null
          header_media_id: string | null
          header_media_mime: string | null
          header_media_type: string | null
          header_media_url: string | null
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
          wa_template_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_count?: number | null
          department_code?: string | null
          failed_count?: number | null
          header_media_id?: string | null
          header_media_mime?: string | null
          header_media_type?: string | null
          header_media_url?: string | null
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
          wa_template_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_count?: number | null
          department_code?: string | null
          failed_count?: number | null
          header_media_id?: string | null
          header_media_mime?: string | null
          header_media_type?: string | null
          header_media_url?: string | null
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
          wa_template_id?: string | null
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
          default_list_id: string | null
          id: string
          space_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_token: string
          created_at?: string
          default_list_id?: string | null
          id?: string
          space_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_token?: string
          created_at?: string
          default_list_id?: string | null
          id?: string
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
      contact_departments: {
        Row: {
          contact_id: string
          contact_type: Database["public"]["Enums"]["contact_type"] | null
          created_at: string
          department_code: Database["public"]["Enums"]["department_type"]
          id: string
          notes: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          department_code: Database["public"]["Enums"]["department_type"]
          id?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          department_code?: Database["public"]["Enums"]["department_type"]
          id?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_departments_contact_id_fkey"
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
      contact_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          contact_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          contact_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          contact_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tag_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "contact_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          department_code?: Database["public"]["Enums"]["department_type"]
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          ai_handling: boolean | null
          ai_takeover_at: string | null
          communication_preference: string | null
          contact_type: Database["public"]["Enums"]["contact_type"] | null
          created_at: string
          department_code: Database["public"]["Enums"]["department_type"] | null
          description: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          onboarding_status: string | null
          operator_takeover_at: string | null
          operator_takeover_by: string | null
          phone: string
          rating: number | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          ai_handling?: boolean | null
          ai_takeover_at?: string | null
          communication_preference?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          onboarding_status?: string | null
          operator_takeover_at?: string | null
          operator_takeover_by?: string | null
          phone: string
          rating?: number | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          ai_handling?: boolean | null
          ai_takeover_at?: string | null
          communication_preference?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          onboarding_status?: string | null
          operator_takeover_at?: string | null
          operator_takeover_by?: string | null
          phone?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: []
      }
      conversation_stages: {
        Row: {
          color: string
          created_at: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          id: string
          is_final: boolean | null
          name: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          department_code: Database["public"]["Enums"]["department_type"]
          id?: string
          is_final?: boolean | null
          name: string
          order_index: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          department_code?: Database["public"]["Enums"]["department_type"]
          id?: string
          is_final?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_states: {
        Row: {
          ai_started_at: string | null
          created_at: string | null
          id: string
          is_ai_active: boolean | null
          last_ai_message_at: string | null
          last_human_message_at: string | null
          last_search_params: Json | null
          negotiation_pending: boolean | null
          operator_id: string | null
          operator_takeover_at: string | null
          pending_properties: Json | null
          phone_number: string
          suggested_price_max: number | null
          triage_stage: string | null
          updated_at: string | null
        }
        Insert: {
          ai_started_at?: string | null
          created_at?: string | null
          id?: string
          is_ai_active?: boolean | null
          last_ai_message_at?: string | null
          last_human_message_at?: string | null
          last_search_params?: Json | null
          negotiation_pending?: boolean | null
          operator_id?: string | null
          operator_takeover_at?: string | null
          pending_properties?: Json | null
          phone_number: string
          suggested_price_max?: number | null
          triage_stage?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_started_at?: string | null
          created_at?: string | null
          id?: string
          is_ai_active?: boolean | null
          last_ai_message_at?: string | null
          last_human_message_at?: string | null
          last_search_params?: Json | null
          negotiation_pending?: boolean | null
          operator_id?: string | null
          operator_takeover_at?: string | null
          pending_properties?: Json | null
          phone_number?: string
          suggested_price_max?: number | null
          triage_stage?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          closed_reason: string | null
          contact_id: string | null
          created_at: string | null
          department_code: Database["public"]["Enums"]["department_type"] | null
          id: string
          last_message_at: string | null
          phone_number: string
          qualification_data: Json | null
          qualification_score: number | null
          stage_id: string | null
          status: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id?: string | null
          created_at?: string | null
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          qualification_data?: Json | null
          qualification_score?: number | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id?: string | null
          created_at?: string | null
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          qualification_data?: Json | null
          qualification_score?: number | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversation_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_messages: {
        Row: {
          can_restore: boolean
          deleted_at: string
          deleted_by: string
          deletion_type: string
          id: string
          message_id: number
          original_message_data: Json
        }
        Insert: {
          can_restore?: boolean
          deleted_at?: string
          deleted_by: string
          deletion_type: string
          id?: string
          message_id: number
          original_message_data: Json
        }
        Update: {
          can_restore?: boolean
          deleted_at?: string
          deleted_by?: string
          deletion_type?: string
          id?: string
          message_id?: number
          original_message_data?: Json
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: Database["public"]["Enums"]["department_type"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_type: string
          updated_at: string | null
        }
        Insert: {
          code: Database["public"]["Enums"]["department_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_type?: string
          updated_at?: string | null
        }
        Update: {
          code?: Database["public"]["Enums"]["department_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      development_materials: {
        Row: {
          created_at: string
          description: string | null
          development_id: string
          file_type: string | null
          file_url: string
          id: string
          is_featured: boolean | null
          material_type: string
          order_index: number | null
          title: string
          whatsapp_media_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          development_id: string
          file_type?: string | null
          file_url: string
          id?: string
          is_featured?: boolean | null
          material_type: string
          order_index?: number | null
          title: string
          whatsapp_media_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          development_id?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_featured?: boolean | null
          material_type?: string
          order_index?: number | null
          title?: string
          whatsapp_media_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_materials_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
        ]
      }
      developments: {
        Row: {
          address: string | null
          ai_instructions: string | null
          amenities: string[] | null
          c2s_project_id: string | null
          city: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          developer: string
          differentials: string[] | null
          faq: Json | null
          hero_image: string | null
          id: string
          is_active: boolean
          name: string
          neighborhood: string | null
          slug: string
          starting_price: number | null
          status: string
          talking_points: string[] | null
          unit_types: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_instructions?: string | null
          amenities?: string[] | null
          c2s_project_id?: string | null
          city?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          developer: string
          differentials?: string[] | null
          faq?: Json | null
          hero_image?: string | null
          id?: string
          is_active?: boolean
          name: string
          neighborhood?: string | null
          slug: string
          starting_price?: number | null
          status?: string
          talking_points?: string[] | null
          unit_types?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_instructions?: string | null
          amenities?: string[] | null
          c2s_project_id?: string | null
          city?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          developer?: string
          differentials?: string[] | null
          faq?: Json | null
          hero_image?: string | null
          id?: string
          is_active?: boolean
          name?: string
          neighborhood?: string | null
          slug?: string
          starting_price?: number | null
          status?: string
          talking_points?: string[] | null
          unit_types?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      flow_execution_logs: {
        Row: {
          action_taken: string | null
          created_at: string | null
          duration_ms: number | null
          execution_id: string | null
          id: string
          input_data: Json | null
          node_id: string
          node_type: string
          output_data: Json | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input_data?: Json | null
          node_id: string
          node_type: string
          output_data?: Json | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input_data?: Json | null
          node_id?: string
          node_type?: string
          output_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          conversation_id: string | null
          current_node_id: string
          error_message: string | null
          flow_id: string | null
          id: string
          phone_number: string
          started_at: string | null
          status: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          conversation_id?: string | null
          current_node_id: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          phone_number: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          conversation_id?: string | null
          current_node_id?: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          phone_number?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "ai_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      function_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          function: Database["public"]["Enums"]["app_function"]
          id: string
          resource: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          function: Database["public"]["Enums"]["app_function"]
          id?: string
          resource: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          function?: Database["public"]["Enums"]["app_function"]
          id?: string
          resource?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_qualification: {
        Row: {
          ai_messages: number | null
          answers: Json | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          detected_bedrooms: number | null
          detected_budget_max: number | null
          detected_budget_min: number | null
          detected_interest: string | null
          detected_neighborhood: string | null
          detected_property_type: string | null
          disqualification_reason: string | null
          id: string
          is_broker: boolean | null
          is_curious: boolean | null
          last_interaction_at: string | null
          last_reengagement_at: string | null
          needs_reengagement: boolean | null
          phone_number: string
          portal_lead_id: string | null
          qualification_score: number | null
          qualification_status: string | null
          questions_answered: number | null
          questions_asked: number | null
          reengagement_attempts: number | null
          sent_to_crm_at: string | null
          started_at: string | null
          total_messages: number | null
          updated_at: string | null
        }
        Insert: {
          ai_messages?: number | null
          answers?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          detected_bedrooms?: number | null
          detected_budget_max?: number | null
          detected_budget_min?: number | null
          detected_interest?: string | null
          detected_neighborhood?: string | null
          detected_property_type?: string | null
          disqualification_reason?: string | null
          id?: string
          is_broker?: boolean | null
          is_curious?: boolean | null
          last_interaction_at?: string | null
          last_reengagement_at?: string | null
          needs_reengagement?: boolean | null
          phone_number: string
          portal_lead_id?: string | null
          qualification_score?: number | null
          qualification_status?: string | null
          questions_answered?: number | null
          questions_asked?: number | null
          reengagement_attempts?: number | null
          sent_to_crm_at?: string | null
          started_at?: string | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_messages?: number | null
          answers?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          detected_bedrooms?: number | null
          detected_budget_max?: number | null
          detected_budget_min?: number | null
          detected_interest?: string | null
          detected_neighborhood?: string | null
          detected_property_type?: string | null
          disqualification_reason?: string | null
          id?: string
          is_broker?: boolean | null
          is_curious?: boolean | null
          last_interaction_at?: string | null
          last_reengagement_at?: string | null
          needs_reengagement?: boolean | null
          phone_number?: string
          portal_lead_id?: string | null
          qualification_score?: number | null
          qualification_status?: string | null
          questions_answered?: number | null
          questions_asked?: number | null
          reengagement_attempts?: number | null
          sent_to_crm_at?: string | null
          started_at?: string | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualification_portal_lead_id_fkey"
            columns: ["portal_lead_id"]
            isOneToOne: false
            referencedRelation: "portal_leads_log"
            referencedColumns: ["id"]
          },
        ]
      }
      message_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          message_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          message_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          message_id?: number
          updated_at?: string
          user_id?: string
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
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_for_everyone: boolean | null
          department_code: Database["public"]["Enums"]["department_type"] | null
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
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
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
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
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
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_conversations: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      portal_leads_log: {
        Row: {
          ai_attended: boolean | null
          ai_attended_at: string | null
          client_listing_id: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          crm_sent_at: string | null
          crm_status: string | null
          day_of_week: number | null
          development_id: string | null
          error_message: string | null
          hour_of_day: number | null
          id: string
          last_reengagement_at: string | null
          lead_source_type: string | null
          lead_temperature: string | null
          message: string | null
          origin_lead_id: string | null
          origin_listing_id: string | null
          portal_origin: string
          processed_at: string | null
          qualification_id: string | null
          raw_payload: Json | null
          reengagement_count: number | null
          status: string | null
          temperature: string | null
          transaction_type: string | null
        }
        Insert: {
          ai_attended?: boolean | null
          ai_attended_at?: string | null
          client_listing_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          crm_sent_at?: string | null
          crm_status?: string | null
          day_of_week?: number | null
          development_id?: string | null
          error_message?: string | null
          hour_of_day?: number | null
          id?: string
          last_reengagement_at?: string | null
          lead_source_type?: string | null
          lead_temperature?: string | null
          message?: string | null
          origin_lead_id?: string | null
          origin_listing_id?: string | null
          portal_origin: string
          processed_at?: string | null
          qualification_id?: string | null
          raw_payload?: Json | null
          reengagement_count?: number | null
          status?: string | null
          temperature?: string | null
          transaction_type?: string | null
        }
        Update: {
          ai_attended?: boolean | null
          ai_attended_at?: string | null
          client_listing_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          crm_sent_at?: string | null
          crm_status?: string | null
          day_of_week?: number | null
          development_id?: string | null
          error_message?: string | null
          hour_of_day?: number | null
          id?: string
          last_reengagement_at?: string | null
          lead_source_type?: string | null
          lead_temperature?: string | null
          message?: string | null
          origin_lead_id?: string | null
          origin_listing_id?: string | null
          portal_origin?: string
          processed_at?: string | null
          qualification_id?: string | null
          raw_payload?: Json | null
          reengagement_count?: number | null
          status?: string | null
          temperature?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_leads_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_log_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_log_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "lead_qualification"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_code: Database["public"]["Enums"]["department_type"] | null
          full_name: string | null
          id: string
          updated_at: string
          user_code: number | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_code?: number | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_code?: number | null
          user_id?: string
          username?: string
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
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_category: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_category: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_category?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
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
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
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
      user_functions: {
        Row: {
          created_at: string
          department_code: Database["public"]["Enums"]["department_type"] | null
          function: Database["public"]["Enums"]["app_function"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          function: Database["public"]["Enums"]["app_function"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_code?:
            | Database["public"]["Enums"]["department_type"]
            | null
          function?: Database["public"]["Enums"]["app_function"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          id: string
          is_custom: boolean | null
          resource: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          id?: string
          is_custom?: boolean | null
          resource: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          id?: string
          is_custom?: boolean | null
          resource?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          blocked_reason: string | null
          blocked_until: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          last_login: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          last_login?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          last_login?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          category: string
          components: Json
          created_at: string
          id: string
          language: string
          media_id: string | null
          media_uploaded_at: string | null
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
          media_id?: string | null
          media_uploaded_at?: string | null
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
          media_id?: string | null
          media_uploaded_at?: string | null
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
      can_access_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_users: { Args: never; Returns: boolean }
      get_contact_message_stats: {
        Args: { phone_numbers: string[] }
        Returns: {
          last_timestamp: string
          phone: string
          total_messages: number
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_department: {
        Args: never
        Returns: Database["public"]["Enums"]["department_type"]
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["department_type"]
      }
      get_user_effective_permissions: {
        Args: { p_user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          is_custom: boolean
          resource: string
        }[]
      }
      get_user_functions: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_function"][]
      }
      has_function: {
        Args: {
          _function: Database["public"]["Enums"]["app_function"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_function"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_attendant: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      app_function: "admin" | "manager" | "attendant" | "marketing"
      contact_status: "ativo" | "inativo" | "bloqueado"
      contact_type:
        | "proprietario"
        | "inquilino"
        | "lead"
        | "interessado"
        | "qualificado"
        | "visitou"
        | "proposta"
        | "comprador"
        | "investidor"
        | "proprietario_vendedor"
        | "negociacao"
        | "prospect"
        | "engajado"
        | "campanha"
      contract_status: "ativo" | "encerrado" | "suspenso"
      department_type: "locacao" | "administrativo" | "vendas" | "marketing"
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
      app_function: ["admin", "manager", "attendant", "marketing"],
      contact_status: ["ativo", "inativo", "bloqueado"],
      contact_type: [
        "proprietario",
        "inquilino",
        "lead",
        "interessado",
        "qualificado",
        "visitou",
        "proposta",
        "comprador",
        "investidor",
        "proprietario_vendedor",
        "negociacao",
        "prospect",
        "engajado",
        "campanha",
      ],
      contract_status: ["ativo", "encerrado", "suspenso"],
      department_type: ["locacao", "administrativo", "vendas", "marketing"],
      user_role: ["admin", "user"],
    },
  },
} as const
