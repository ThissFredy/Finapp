import { redirect } from "next/navigation";

import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { getServerSession } from "@/core/services/auth.service";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background font-bold text-2xl">
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
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            No se pudo completar el inicio de sesión. Inténtalo de nuevo.
          </div>
        )}

        <GoogleLoginButton redirectFrom={params.from} />
      </div>
    </div>
  );
}
