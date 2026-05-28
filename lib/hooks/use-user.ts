"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/database.types";

interface UserState {
  user: User | null;
  role: UserRole | null;
  fullName: string | null;
  loading: boolean;
}

/**
 * Reads the current auth user + their profile (role, full_name) on the client,
 * staying in sync via onAuthStateChange. Used by the navbar (avatar initial
 * comes from full_name).
 */
export function useUser(): UserState {
  const [state, setState] = React.useState<UserState>({
    user: null,
    role: null,
    fullName: null,
    loading: true,
  });

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active)
          setState({ user: null, role: null, fullName: null, loading: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (active)
        setState({
          user,
          role: (profile?.role as UserRole) ?? "student",
          fullName: profile?.full_name ?? null,
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
