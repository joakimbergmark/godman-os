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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounting_years: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          principal_id: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          principal_id: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          principal_id?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_years_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "principal"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number: string | null
          account_type: string
          bank_name: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          opening_balance_date: string | null
          owner_id: string
          principal_id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          bank_name?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          owner_id: string
          principal_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          bank_name?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          owner_id?: string
          principal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "principal"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          accounting_year_id: string | null
          activity_date: string
          case_id: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          accounting_year_id?: string | null
          activity_date?: string
          case_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          accounting_year_id?: string | null
          activity_date?: string
          case_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_accounting_year_id_fkey"
            columns: ["accounting_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_decisions: {
        Row: {
          case_id: string
          created_at: string
          decision_date: string
          description: string | null
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          decision_date?: string
          description?: string | null
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          decision_date?: string
          description?: string | null
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_decisions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          accounting_year_id: string
          authority_contact_id: string | null
          category: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          life_area: string
          notes: string | null
          owner_id: string
          principal_id: string
          priority: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accounting_year_id: string
          authority_contact_id?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          life_area?: string
          notes?: string | null
          owner_id: string
          principal_id: string
          priority?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accounting_year_id?: string
          authority_contact_id?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          life_area?: string
          notes?: string | null
          owner_id?: string
          principal_id?: string
          priority?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_accounting_year_id_fkey"
            columns: ["accounting_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_authority_contact_id_fkey"
            columns: ["authority_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "principal"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          owner_id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          accounting_year_id: string | null
          case_id: string | null
          category: string | null
          comment: string | null
          created_at: string
          document_date: string | null
          file_name: string | null
          id: string
          mime_type: string | null
          owner_id: string
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          accounting_year_id?: string | null
          case_id?: string | null
          category?: string | null
          comment?: string | null
          created_at?: string
          document_date?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          owner_id: string
          size_bytes?: number | null
          storage_path: string
          title: string
          updated_at?: string
        }
        Update: {
          accounting_year_id?: string | null
          case_id?: string | null
          category?: string | null
          comment?: string | null
          created_at?: string
          document_date?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_accounting_year_id_fkey"
            columns: ["accounting_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      principal: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string
          personal_number: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id: string
          personal_number?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          personal_number?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          accounting_year_id: string | null
          case_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          owner_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accounting_year_id?: string | null
          case_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          owner_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accounting_year_id?: string | null
          case_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          owner_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_accounting_year_id_fkey"
            columns: ["accounting_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          accounting_year_id: string | null
          amount: number
          case_id: string | null
          category_id: string | null
          comment: string | null
          counter_account_id: string | null
          created_at: string
          document_id: string | null
          id: string
          owner_id: string
          principal_id: string
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          accounting_year_id?: string | null
          amount: number
          case_id?: string | null
          category_id?: string | null
          comment?: string | null
          counter_account_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          owner_id: string
          principal_id: string
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          accounting_year_id?: string | null
          amount?: number
          case_id?: string | null
          category_id?: string | null
          comment?: string | null
          counter_account_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          owner_id?: string
          principal_id?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_accounting_year_id_fkey"
            columns: ["accounting_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "principal"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
