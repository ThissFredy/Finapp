import { z } from "zod";

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  preferred_currency: z.enum(["COP", "USD", "EUR"]).default("COP"),
  created_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const AuthSessionSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
  profile: ProfileSchema.nullable(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;
