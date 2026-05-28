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
      applications: {
        Row: {
          club_id: string
          created_at: string
          id: string
          note: string | null
          profile_id: string
          responses: Json
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          note?: string | null
          profile_id: string
          responses?: Json
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          note?: string | null
          profile_id?: string
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
            foreignKeyName: "applications_profile_id_fkey"
            columns: ["profile_id"]
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
          category_id: string | null
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
          category_id?: string | null
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
          category_id?: string | null
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
          sort_order: number
        }
        Insert: {
          caption?: string | null
          club_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          club_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_club_content: { Args: { target_club: string }; Returns: boolean }
      can_manage_admins: { Args: { target_club: string }; Returns: boolean }
      can_manage_applications: {
        Args: { target_club: string }
        Returns: boolean
      }
      club_tier: { Args: { target_club: string }; Returns: string }
      is_club_admin: { Args: { target_club: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      application_status:
        | "pending"
        | "reviewing"
        | "accepted"
        | "rejected"
        | "withdrawn"
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