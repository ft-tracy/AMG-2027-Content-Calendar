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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      calendar_event_links: {
        Row: {
          google_event_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          google_event_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          google_event_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          end_at: string | null
          end_date: string | null
          id: string
          location: string | null
          source_calendar: string
          start_at: string | null
          start_date: string | null
          timezone: string | null
          title: string
          uid: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          end_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          source_calendar?: string
          start_at?: string | null
          start_date?: string | null
          timezone?: string | null
          title: string
          uid: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          end_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          source_calendar?: string
          start_at?: string | null
          start_date?: string | null
          timezone?: string | null
          title?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_feed_tokens: {
        Row: {
          created_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_feed_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_campaigns: {
        Row: {
          key_message: string | null
          month_start: string
          monthly_goal: string | null
          target_audience: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key_message?: string | null
          month_start: string
          monthly_goal?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key_message?: string | null
          month_start?: string
          monthly_goal?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_key: string
          id: string
          kind: string
          message: string
          read_at: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          kind: string
          message: string
          read_at?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_secret: string
          created_at: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_secret: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_secret?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          name: string
          path: string
          task_id: string
          uploaded_by: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          name: string
          path: string
          task_id: string
          uploaded_by?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          name?: string
          path?: string
          task_id?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assignee_ids: string[]
          caption: string | null
          completed: boolean
          content_type: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          hashtags: string | null
          id: string
          platforms: string[]
          reminder_minutes: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assignee_ids?: string[]
          caption?: string | null
          completed?: boolean
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date: string
          hashtags?: string | null
          id?: string
          platforms?: string[]
          reminder_minutes?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assignee_ids?: string[]
          caption?: string | null
          completed?: boolean
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          hashtags?: string | null
          id?: string
          platforms?: string[]
          reminder_minutes?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      generate_due_task_notifications: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approver: { Args: { _user_id: string }; Returns: boolean }
      is_company_google_user: { Args: { _user_id: string }; Returns: boolean }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "director" | "manager" | "member" | "admin"
      task_status:
        | "draft"
        | "pending_review"
        | "revisions"
        | "approved"
        | "published"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["director", "manager", "member", "admin"],
      task_status: [
        "draft",
        "pending_review",
        "revisions",
        "approved",
        "published",
      ],
    },
  },
} as const
