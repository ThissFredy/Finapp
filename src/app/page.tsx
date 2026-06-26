import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getServerSession } from "@/core/services/auth.service";

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background font-bold text-xl">
            F
          </div>
          <span className="text-2xl font-bold tracking-tight">FinApp</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Gestiona tus finanzas personales
        </h1>

        <p className="text-lg text-muted-foreground">
          FinApp te ayuda a controlar tus ingresos, gastos y suscripciones en un
          solo lugar. Inicia sesión con tu cuenta de Google para comenzar.
        </p>

        <Link
          href="/login"
          className={cn(buttonVariants({ size: "lg" }), "min-w-[200px]")}
        >
          Comenzar ahora
        </Link>
      </main>
    </div>
  );
}
