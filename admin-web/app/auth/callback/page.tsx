"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Implicit-flow OAuth callback: the admin-web Supabase client uses the
// default flowType ("implicit"), so tokens arrive in the URL hash fragment
// and are parsed client-side by the singleton client's detectSessionInUrl
// handling. A server route handler cannot read the fragment (browsers never
// send it to the server), so this must be a client component, matching the
// existing /reset-password callback pattern in this app.
export default function AuthCallbackPage() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    async function finalize(userId: string) {
      if (handledRef.current) return;
      handledRef.current = true;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/login?error=not_admin");
        return;
      }

      router.replace("/dashboard");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        finalize(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        finalize(data.session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Signing in…</p>
    </main>
  );
}
