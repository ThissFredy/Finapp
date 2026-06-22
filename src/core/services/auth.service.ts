import { createServerClientInstance } from "@/core/db/supabase.server";
import { AuthSessionSchema, ProfileSchema } from "@/core/models/profile";

export async function getServerSession() {
  const supabase = await createServerClientInstance();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const profile = await getServerProfile();

  const result = AuthSessionSchema.safeParse({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

export async function getServerProfile() {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, preferred_currency, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  const result = ProfileSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return result.data;
}
