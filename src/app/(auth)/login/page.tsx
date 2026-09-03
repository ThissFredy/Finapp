import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FadeIn } from "@/components/ui/motion";
import { getServerSession } from "@/core/services/auth.service";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Accede a tu cuenta de FinApp para gestionar tus finanzas.",
};

interface LoginPageProps {
  searchParams: Promise<{
    from?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession();
  const params = await searchParams;

  if (session) {
    redirect(params.from ?? "/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-[calc(env(safe-area-inset-top)+env(safe-area-inset-bottom)+2rem)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <FadeIn direction="scale" className="w-full max-w-sm">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.62_0.22_330)] font-bold text-2xl text-primary-foreground shadow-lg shadow-primary/30">
              F
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
                Bienvenido a FinApp
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Inicia sesión para continuar
              </p>
            </div>
          </div>

          {params.error === "auth_failed" && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in"
            >
              No se pudo completar el inicio de sesión. Inténtalo de nuevo.
            </div>
          )}

          <GoogleLoginButton redirectFrom={params.from} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Al continuar, aceptas nuestros términos y política de privacidad.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
