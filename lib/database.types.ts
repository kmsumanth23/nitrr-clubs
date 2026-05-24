/**
 * Hand-written to match 01_schema.sql. Keeps the app type-safe before
 * we wire `supabase gen types`. Regenerate later (see SETUP_STEP2.md §7).
 */

export type UserRole = "student" | "admin" | "super_admin";
export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          role: UserRole;
          branch: string | null;
          year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          branch?: string | null;
          year?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string | null;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          color?: string | null;
          icon?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      clubs: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          category_id: string | null;
          logo_url: string | null;
          cover_url: string | null;
          highlights: string[];
          member_count: number | null;
          is_recruiting: boolean;
          instagram_url: string | null;
          linkedin_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          category_id?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          highlights?: string[];
          member_count?: number | null;
          is_recruiting?: boolean;
          instagram_url?: string | null;
          linkedin_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
      };
      club_admins: {
        Row: {
          id: string;
          club_id: string;
          profile_id: string;
          admin_role: string;
          created_at: string;
        };
        Insert: {
          club_id: string;
          profile_id: string;
          admin_role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["club_admins"]["Insert"]>;
      };
      club_team: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          role: string | null;
          photo_url: string | null;
          contact: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          club_id: string;
          name: string;
          role?: string | null;
          photo_url?: string | null;
          contact?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["club_team"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          club_id: string;
          slug: string;
          title: string;
          description: string | null;
          poster_url: string | null;
          venue: string | null;
          starts_at: string | null;
          ends_at: string | null;
          reg_open: boolean;
          reg_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          club_id: string;
          slug: string;
          title: string;
          description?: string | null;
          poster_url?: string | null;
          venue?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          reg_open?: boolean;
          reg_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      applications: {
        Row: {
          id: string;
          club_id: string;
          profile_id: string;
          status: ApplicationStatus;
          responses: Record<string, unknown>;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          club_id: string;
          profile_id: string;
          status?: ApplicationStatus;
          responses?: Record<string, unknown>;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
      };
      gallery_photos: {
        Row: {
          id: string;
          club_id: string;
          event_id: string | null;
          image_url: string;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          club_id: string;
          event_id?: string | null;
          image_url: string;
          caption?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["gallery_photos"]["Insert"]>;
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort_order: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          question: string;
          answer: string;
          sort_order?: number;
          is_published?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["faqs"]["Insert"]>;
      };
    };
    Enums: {
      user_role: UserRole;
      application_status: ApplicationStatus;
    };
  };
}

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Club = Database["public"]["Tables"]["clubs"]["Row"];
export type ClubTeam = Database["public"]["Tables"]["club_team"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"];
export type Faq = Database["public"]["Tables"]["faqs"]["Row"];
