"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export type AdminSession = {
  userId: string;
  email: string | null;
};

// Shared by /dashboard, /members, and /members/[id]: redirects to /login
// unless there is a session AND profiles.role === "admin" for that user.
export function useAdminGuard() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!active) return;

      if (error || profile?.role !== "admin") {
        router.replace("/login");
        return;
      }

      setSession({ userId: user.id, email: user.email ?? null });
      setChecking(false);
    }

    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return { session, checking };
}
