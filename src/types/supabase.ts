export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          dictionary_id: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dictionary_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dictionary_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      business_terms: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          definition: string | null
          domain: string | null
          id: string
          metadata: Json | null
          name: string
          search_vector: unknown | null
          status: string | null
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          definition?: string | null
          domain?: string | null
          id?: string
          metadata?: Json | null
          name: string
          search_vector?: unknown | null
          status?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          definition?: string | null
          domain?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          search_vector?: unknown | null
          status?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_terms_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          created_at: string | null
          entry_id: string
          id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          created_at?: string | null
          entry_id: string
          id?: string
          text: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string | null
          entry_id?: string
          id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      dictionaries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string | null
          id: string
          is_archived: boolean | null
          is_public: boolean | null
          metadata: Json | null
          name: string
          status: string | null
          steward: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          status?: string | null
          steward?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          status?: string | null
          steward?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      dictionary_activity: {
        Row: {
          active_users: number | null
          created_at: string | null
          dictionary_id: string | null
          edits: number | null
          id: string
          searches: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          dictionary_id?: string | null
          edits?: number | null
          id?: string
          searches?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          dictionary_id?: string | null
          edits?: number | null
          id?: string
          searches?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_activity_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      dictionary_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_type: string
          description: string | null
          dictionary_id: string | null
          field_name: string
          id: string
          impact_score: number | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          metadata: Json | null
          related_fields: Json | null
          review_status: string | null
          sample_values: Json | null
          search_vector: unknown | null
          updated_at: string | null
          validation_rules: Json | null
          version: number | null
          workflow_status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_type: string
          description?: string | null
          dictionary_id?: string | null
          field_name: string
          id?: string
          impact_score?: number | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          metadata?: Json | null
          related_fields?: Json | null
          review_status?: string | null
          sample_values?: Json | null
          search_vector?: unknown | null
          updated_at?: string | null
          validation_rules?: Json | null
          version?: number | null
          workflow_status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_type?: string
          description?: string | null
          dictionary_id?: string | null
          field_name?: string
          id?: string
          impact_score?: number | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          metadata?: Json | null
          related_fields?: Json | null
          review_status?: string | null
          sample_values?: Json | null
          search_vector?: unknown | null
          updated_at?: string | null
          validation_rules?: Json | null
          version?: number | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dictionary_entries_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dictionary_entries_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_results: {
        Row: {
          created_at: string | null
          document_id: string
          errors: string[] | null
          extracted_terms: Json
          id: string
          processing_metrics: Json
          status: Database["public"]["Enums"]["processing_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          errors?: string[] | null
          extracted_terms: Json
          id?: string
          processing_metrics: Json
          status?: Database["public"]["Enums"]["processing_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          errors?: string[] | null
          extracted_terms?: Json
          id?: string
          processing_metrics?: Json
          status?: Database["public"]["Enums"]["processing_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      entry_tags: {
        Row: {
          entry_id: string
          tag_id: string
        }
        Insert: {
          entry_id: string
          tag_id: string
        }
        Update: {
          entry_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_tags_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_versions: {
        Row: {
          changes: Json
          created_at: string | null
          created_by: string | null
          dictionary_id: string
          entry_id: string | null
          id: string
          version: number
        }
        Insert: {
          changes: Json
          created_at?: string | null
          created_by?: string | null
          dictionary_id: string
          entry_id?: string | null
          id?: string
          version: number
        }
        Update: {
          changes?: Json
          created_at?: string | null
          created_by?: string | null
          dictionary_id?: string
          entry_id?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "entry_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_versions_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_versions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      external_systems: {
        Row: {
          connected_fields: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dictionary_id: string | null
          id: string
          name: string
          system_type: string
        }
        Insert: {
          connected_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dictionary_id?: string | null
          id?: string
          name: string
          system_type: string
        }
        Update: {
          connected_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dictionary_id?: string | null
          id?: string
          name?: string
          system_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_systems_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_systems_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          device_type: string
          dictionary_id: string | null
          id: string
          interaction_time: number
          load_time: number
          user_agent: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type: string
          dictionary_id?: string | null
          id?: string
          interaction_time: number
          load_time: number
          user_agent: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string
          dictionary_id?: string | null
          id?: string
          interaction_time?: number
          load_time?: number
          user_agent?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_alerts: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_alerts_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_metrics: {
        Row: {
          accuracy_score: number | null
          completeness_score: number | null
          consistency_score: number | null
          created_at: string | null
          field_id: string | null
          id: string
          last_checked: string | null
          score: number
          validity_score: number | null
        }
        Insert: {
          accuracy_score?: number | null
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          last_checked?: string | null
          score: number
          validity_score?: number | null
        }
        Update: {
          accuracy_score?: number | null
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          last_checked?: string | null
          score?: number
          validity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_metrics_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_rules: {
        Row: {
          condition: Database["public"]["Enums"]["quality_rule_condition"]
          created_at: string | null
          created_by: string
          description: string
          dictionary_id: string
          enabled: boolean
          field: string
          id: string
          name: string
          severity: Database["public"]["Enums"]["quality_rule_severity"]
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          condition: Database["public"]["Enums"]["quality_rule_condition"]
          created_at?: string | null
          created_by: string
          description: string
          dictionary_id: string
          enabled?: boolean
          field: string
          id?: string
          name: string
          severity: Database["public"]["Enums"]["quality_rule_severity"]
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          condition?: Database["public"]["Enums"]["quality_rule_condition"]
          created_at?: string | null
          created_by?: string
          description?: string
          dictionary_id?: string
          enabled?: boolean
          field?: string
          id?: string
          name?: string
          severity?: Database["public"]["Enums"]["quality_rule_severity"]
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_rules_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_scores: {
        Row: {
          created_at: string | null
          dimension_scores: Json
          entry_id: string | null
          failed_rules: Json[] | null
          id: string
          total_score: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dimension_scores: Json
          entry_id?: string | null
          failed_rules?: Json[] | null
          id?: string
          total_score: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dimension_scores?: Json
          entry_id?: string | null
          failed_rules?: Json[] | null
          id?: string
          total_score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_violations: {
        Row: {
          created_at: string | null
          entry_id: string
          field: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string
          severity: Database["public"]["Enums"]["quality_rule_severity"]
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          field: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id: string
          severity: Database["public"]["Enums"]["quality_rule_severity"]
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          field?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string
          severity?: Database["public"]["Enums"]["quality_rule_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "quality_violations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "quality_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          dictionary_id: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dictionary_id?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dictionary_id?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      term_relationships: {
        Row: {
          context: string | null
          created_at: string | null
          created_by: string | null
          entry_id: string | null
          id: string
          relationship_type: string
          term_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_id?: string | null
          id?: string
          relationship_type?: string
          term_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_id?: string | null
          id?: string
          relationship_type?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_relationships_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_relationships_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "business_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_metrics: {
        Row: {
          day: string | null
          dictionary_id: string | null
          edits: number | null
          searches: number | null
          total_events: number | null
          unique_users: number | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_metrics: {
        Row: {
          dictionary_id: string | null
          edits: number | null
          month: string | null
          searches: number | null
          total_events: number | null
          unique_users: number | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_dictionary_id_fkey"
            columns: ["dictionary_id"]
            isOneToOne: false
            referencedRelation: "dictionaries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_impact_score: {
        Args: {
          field_id: string
        }
        Returns: number
      }
      create_performance_metrics_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_tsvector: {
        Args: {
          field_name: string
          description: string
          data_type: string
          sample_values: Json
        }
        Returns: unknown
      }
      get_dictionary_metrics: {
        Args: {
          p_dictionary_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          timeframe: string
          unique_users: number
          total_events: number
          views: number
          edits: number
          searches: number
          period_start: string
        }[]
      }
      get_entry_history: {
        Args: {
          p_dictionary_id: string
          p_entry_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          entry_id: string
          dictionary_id: string
          version: number
          changes: Json
          created_at: string
          created_by: string
          field_name: string
          user_email: string
        }[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      processing_status: "completed" | "failed" | "partial"
      quality_rule_condition:
        | "required"
        | "minLength"
        | "maxLength"
        | "pattern"
        | "enum"
      quality_rule_severity: "error" | "warning" | "info"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
