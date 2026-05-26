"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/supabase__client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/database.types";

interface UserState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

/**
 * Reads the current auth user (and their role from profiles) on the client,
 * and stays in sync via onAuthStateChange. Used by the navbar.
 */
export function useUser(): UserState {
  const [state, setState] = React.useState<UserState>({
    user: null,
    role: null,
    loading: true,
  });

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ user: null, role: null, loading: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (active)
        setState({
          user,
          role: (profile?.role as UserRole) ?? "student",
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
