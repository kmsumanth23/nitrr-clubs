"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/database.types";

interface UserState {
  user: User | null;
  role: UserRole | null;
  fullName: string | null;
  /** True if the user has at least one row in club_admins. */
  isClubAdmin: boolean;
  loading: boolean;
}

/**
 * Reads the current auth user + profile (role, name) on the client, and also
 * checks whether they're a club admin (any row in club_admins). The navbar
 * uses isClubAdmin OR super_admin to show the "Admin" link, since global role
 * is no longer the authority — club_admins membership is.
 */
export function useUser(): UserState {
  const [state, setState] = React.useState<UserState>({
    user: null,
    role: null,
    fullName: null,
    isClubAdmin: false,
    loading: true,
  });

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active)
          setState({
            user: null,
            role: null,
            fullName: null,
            isClubAdmin: false,
            loading: false,
          });
        return;
      }
      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("club_admins")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id),
      ]);
      if (active)
        setState({
          user,
          role: (profile?.role as UserRole) ?? "student",
          fullName: profile?.full_name ?? null,
          isClubAdmin: (count ?? 0) > 0,
          loading: false,
        });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
