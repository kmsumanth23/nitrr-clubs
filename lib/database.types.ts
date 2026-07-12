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
      application_notes: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          club_id: string
          created_at: string
          id: string
          note: string | null
          note_at: string | null
          note_by: string | null
          profile_id: string
          recruitment_id: string
          responses: Json
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          note?: string | null
          note_at?: string | null
          note_by?: string | null
          profile_id: string
          recruitment_id: string
          responses?: Json
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          note?: string | null
          note_at?: string | null
          note_by?: string | null
          profile_id?: string
          recruitment_id?: string
          responses?: Json
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_note_by_fkey"
            columns: ["note_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_recruitment_id_fkey"
            columns: ["recruitment_id"]
            isOneToOne: false
            referencedRelation: "recruitments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_club_id: string | null
          target_profile_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_club_id?: string | null
          target_profile_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_club_id?: string | null
          target_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_target_club_id_fkey"
            columns: ["target_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      club_admins: {
        Row: {
          admin_role: string
          club_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          admin_role?: string
          club_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          admin_role?: string
          club_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_admins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          profile_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          profile_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_team: {
        Row: {
          club_id: string
          contact: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          role: string | null
          sort_order: number
        }
        Insert: {
          club_id: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
        }
        Update: {
          club_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_team_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          archived_at: string | null
          category_id: string | null
          community_whatsapp_link: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          highlights: string[] | null
          id: string
          instagram_url: string | null
          is_recruiting: boolean
          linkedin_url: string | null
          logo_url: string | null
          member_count: number | null
          name: string
          slug: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          community_whatsapp_link?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          highlights?: string[] | null
          id?: string
          instagram_url?: string | null
          is_recruiting?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          member_count?: number | null
          name: string
          slug: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          community_whatsapp_link?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          highlights?: string[] | null
          id?: string
          instagram_url?: string | null
          is_recruiting?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          member_count?: number | null
          name?: string
          slug?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_questions: {
        Row: {
          created_at: string
          id: string
          prompt: string
          question_type: string
          recruitment_id: string
          required: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          question_type?: string
          recruitment_id: string
          required?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          question_type?: string
          recruitment_id?: string
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "drive_questions_recruitment_id_fkey"
            columns: ["recruitment_id"]
            isOneToOne: false
            referencedRelation: "recruitments"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          poster_url: string | null
          reg_open: boolean
          reg_url: string | null
          slug: string
          starts_at: string | null
          title: string
          updated_at: string
          updated_by: string | null
          venue: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          poster_url?: string | null
          reg_open?: boolean
          reg_url?: string | null
          slug: string
          starts_at?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          poster_url?: string | null
          reg_open?: boolean
          reg_url?: string | null
          slug?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          club_id: string
          created_at: string
          event_id: string | null
          id: string
          image_url: string
          show_on_homepage: boolean
          sort_order: number
        }
        Insert: {
          caption?: string | null
          club_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url: string
          show_on_homepage?: boolean
          sort_order?: number
        }
        Update: {
          caption?: string | null
          club_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string
          show_on_homepage?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          roll_number: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          roll_number?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          roll_number?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      recruitments: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          interview_mode: string | null
          interview_whatsapp_link: string | null
          name: string | null
          published_at: string | null
          result_date: string | null
          results_published_at: string | null
          results_published_by: string | null
          target_years: number[]
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          interview_mode?: string | null
          interview_whatsapp_link?: string | null
          name?: string | null
          published_at?: string | null
          result_date?: string | null
          results_published_at?: string | null
          results_published_by?: string | null
          target_years?: number[]
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          interview_mode?: string | null
          interview_whatsapp_link?: string | null
          name?: string | null
          published_at?: string | null
          result_date?: string | null
          results_published_at?: string | null
          results_published_by?: string | null
          target_years?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "recruitments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitments_results_published_by_fkey"
            columns: ["results_published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_club_admin: {
        Args: { club_id_in: string; profile_id_in: string; tier_in: string }
        Returns: undefined
      }
      add_drive_question: {
        Args: {
          drive_id_in: string
          prompt_in: string
          question_type_in: string
          required_in: boolean
        }
        Returns: string
      }
      can_edit_club_content: { Args: { target_club: string }; Returns: boolean }
      can_manage_admins: { Args: { target_club: string }; Returns: boolean }
      can_manage_applications: {
        Args: { target_club: string }
        Returns: boolean
      }
      can_manage_club_admins: { Args: { club_id_in: string }; Returns: boolean }
      can_manage_gallery: { Args: { club_id_in: string }; Returns: boolean }
      change_club_admin_tier: {
        Args: { club_id_in: string; new_tier_in: string; profile_id_in: string }
        Returns: undefined
      }
      club_id_from_slug: { Args: { slug_in: string }; Returns: string }
      club_tier: { Args: { target_club: string }; Returns: string }
      count_clubs_in_category: {
        Args: { category_id_in: string }
        Returns: number
      }
      count_clubs_without_admins: { Args: never; Returns: number }
      create_club: {
        Args: {
          category_id_in: string
          initial_lead_profile_id_in: string
          name_in: string
          slug_in: string
        }
        Returns: string
      }
      create_drive: {
        Args: {
          club_id_in: string
          deadline_in: string
          description_in: string
          name_in: string
          result_date_in: string
          target_years_in: number[]
        }
        Returns: string
      }
      current_recruitment_for_club: {
        Args: { club_id_in: string }
        Returns: string
      }
      decommission_club: { Args: { club_id_in: string }; Returns: undefined }
      delete_archived_club: {
        Args: { club_id_in: string; slug_confirm: string }
        Returns: undefined
      }
      delete_drive: { Args: { drive_id_in: string }; Returns: undefined }
      delete_drive_question: {
        Args: { question_id_in: string }
        Returns: undefined
      }
      get_counter_drift: {
        Args: never
        Returns: {
          actual_count: number
          club_id: string
          drift: number
          manual_count: number
          name: string
          slug: string
        }[]
      }
      get_largest_photos: {
        Args: { limit_in?: number; threshold_bytes?: number }
        Returns: {
          bytes: number
          club_name: string
          club_slug: string
          path: string
          uploaded_at: string
        }[]
      }
      get_storage_usage: {
        Args: never
        Returns: {
          club_name: string
          club_slug: string
          file_count: number
          total_bytes: number
        }[]
      }
      is_club_admin: { Args: { target_club: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      publish_drive: { Args: { drive_id_in: string }; Returns: undefined }
      publish_recruitment_results: {
        Args: { recruitment_id_in: string }
        Returns: undefined
      }
      recompute_all_member_counts: { Args: never; Returns: number }
      recompute_member_count: { Args: { club_id_in: string }; Returns: number }
      recruitment_phase: {
        Args: { recruitment_id_in: string }
        Returns: string
      }
      recruitments_overdue: {
        Args: never
        Returns: {
          club_id: string
          club_name: string
          club_slug: string
          days_overdue: number
          recruitment_id: string
          recruitment_name: string
          result_date: string
        }[]
      }
      remove_club_admin: {
        Args: { club_id_in: string; profile_id_in: string }
        Returns: undefined
      }
      remove_member: {
        Args: { club_id_in: string; profile_id_in: string }
        Returns: undefined
      }
      restore_club: { Args: { club_id_in: string }; Returns: undefined }
      set_super_admin: {
        Args: { profile_id_in: string; value_in: boolean }
        Returns: undefined
      }
      start_new_recruitment: {
        Args: {
          club_id_in: string
          deadline_in: string
          interview_mode_in?: string
          interview_whatsapp_link_in?: string
          name_in: string
          result_date_in: string
        }
        Returns: string
      }
      swap_category_order: {
        Args: { id_a: string; id_b: string }
        Returns: undefined
      }
      swap_drive_question_order: {
        Args: { question_a_in: string; question_b_in: string }
        Returns: undefined
      }
      swap_faq_order: {
        Args: { id_a: string; id_b: string }
        Returns: undefined
      }
      update_drive: {
        Args: {
          deadline_in: string
          description_in: string
          drive_id_in: string
          name_in: string
          result_date_in: string
          target_years_in: number[]
        }
        Returns: undefined
      }
      update_drive_question: {
        Args: {
          prompt_in: string
          question_id_in: string
          question_type_in: string
          required_in: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      application_status:
        | "pending"
        | "reviewing"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "removed"
      user_role: "student" | "admin" | "super_admin"
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
      application_status: [
        "pending",
        "reviewing",
        "accepted",
        "rejected",
        "withdrawn",
        "removed",
      ],
      user_role: ["student", "admin", "super_admin"],
    },
  },
} as const

// Convenience row aliases used throughout the app
export type UserRole = Database["public"]["Enums"]["user_role"]
export type ApplicationStatus = Database["public"]["Enums"]["application_status"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Club = Database["public"]["Tables"]["clubs"]["Row"]
export type ClubAdmin = Database["public"]["Tables"]["club_admins"]["Row"]
export type ClubTeam = Database["public"]["Tables"]["club_team"]["Row"]
export type EventRow = Database["public"]["Tables"]["events"]["Row"]
export type Application = Database["public"]["Tables"]["applications"]["Row"]
export type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"]
export type Faq = Database["public"]["Tables"]["faqs"]["Row"]

// --- hand-appended aliases (re-add after each regen) ---
export type ClubMember = Database["public"]["Tables"]["club_members"]["Row"];
export type AdminTier = "lead" | "manager" | "editor";