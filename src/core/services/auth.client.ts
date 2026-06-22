"use client";

import { createClient } from "@/core/db/supabase";

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        redirectTo ?? `${window.location.origin}/api/auth/callback`,
      scopes: "openid email profile",
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
