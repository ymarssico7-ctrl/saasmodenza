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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          credit_id: string
          id: string
          paid_on: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_id: string
          id?: string
          paid_on?: string
          store_id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_id?: string
          id?: string
          paid_on?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string
          due_date: string
          id: string
          paid_amount: number
          purchase_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description: string
          due_date: string
          id?: string
          paid_amount?: number
          purchase_date?: string
          store_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string
          due_date?: string
          id?: string
          paid_amount?: number
          purchase_date?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          store_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          month: string
          store_id: string | null
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          store_id?: string
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          store_id?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          color: string | null
          cost_price: number
          created_at: string
          id: string
          name: string
          photo_url: string | null
          sale_price: number
          sizes: Json
          sold_this_month: number
          supplier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          sale_price?: number
          sizes?: Json
          sold_this_month?: number
          store_id?: string
          supplier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sale_price?: number
          sizes?: Json
          sold_this_month?: number
          store_id?: string
          supplier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricings: {
        Row: {
          created_at: string
          freight_cost: number
          id: string
          margin_pct: number
          name: string
          other_costs: number
          packaging_cost: number
          tax_pct: number
          updated_at: string
          user_id: string
          wholesale_cost: number
        }
        Insert: {
          created_at?: string
          freight_cost?: number
          id?: string
          margin_pct?: number
          name: string
          other_costs?: number
          packaging_cost?: number
          store_id?: string
          tax_pct?: number
          updated_at?: string
          user_id: string
          wholesale_cost?: number
        }
        Update: {
          created_at?: string
          freight_cost?: number
          id?: string
          margin_pct?: number
          name?: string
          other_costs?: number
          packaging_cost?: number
          store_id?: string
          tax_pct?: number
          updated_at?: string
          user_id?: string
          wholesale_cost?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          id: string
          logo_url: string | null
          onboarding_done: boolean
          owner_name: string
          phone: string | null
          plan: string
          plan_renewal_date: string | null
          prolabore_target: number
          store_name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id: string
          logo_url?: string | null
          onboarding_done?: boolean
          owner_name?: string
          phone?: string | null
          plan?: string
          plan_renewal_date?: string | null
          prolabore_target?: number
          store_name?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          onboarding_done?: boolean
          owner_name?: string
          phone?: string | null
          plan?: string
          plan_renewal_date?: string | null
          prolabore_target?: number
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      prolabore_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          store_id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          store_id?: string
          user_id?: string
        }
        Relationships: []
      }
      store_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string
          store_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          city: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          onboarding_done: boolean
          owner_id: string
          phone: string | null
          plan: string
          plan_expires_at: string | null
          plan_renewal_date: string | null
          prolabore_target: number
          slug: string | null
          store_subscription_active: boolean
          store_subscription_expires_at: string | null
          store_trial_accepted: boolean | null
          store_trial_expires_at: string | null
          store_trial_offered_at: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_done?: boolean
          owner_id: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_renewal_date?: string | null
          prolabore_target?: number
          slug?: string | null
          store_subscription_active?: boolean
          store_subscription_expires_at?: string | null
          store_trial_accepted?: boolean | null
          store_trial_expires_at?: string | null
          store_trial_offered_at?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_done?: boolean
          owner_id?: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_renewal_date?: string | null
          prolabore_target?: number
          slug?: string | null
          store_subscription_active?: boolean
          store_subscription_expires_at?: string | null
          store_trial_accepted?: boolean | null
          store_trial_expires_at?: string | null
          store_trial_offered_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          kind: string
          occurred_on: string
          payment_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          id?: string
          kind: string
          occurred_on?: string
          payment_method: string
          store_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          occurred_on?: string
          payment_method?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
