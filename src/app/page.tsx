import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  PiggyBank,
  CreditCard,
  ArrowRight,
  Shield,
  BarChart3,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/motion";
import { getServerSession } from "@/core/services/auth.service";

const features = [
  {
    icon: TrendingUp,
    title: "Control total",
    description: "Registra ingresos y gastos al instante y mantén tu dinero bajo control.",
  },
  {
    icon: PiggyBank,
    title: "Ahorro consciente",
    description: "Visualiza tus hábitos y descubre oportunidades para ahorrar más.",
  },
  {
    icon: CreditCard,
    title: "Suscripciones claras",
    description: "Nunca más te sorprenda un cargo recurrente olvidado.",
  },
  {
    icon: BarChart3,
    title: "Resumen mensual",
    description: "Gráficas simples que te muestran tu salud financiera de un vistazo.",
  },
];

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-[calc(env(safe-area-inset-top)+env(safe-area-inset-bottom)+2rem)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex max-w-2xl flex-col items-center gap-10 text-center">
        <FadeIn direction="up" delay={1}>
          <div className="flex items-center gap-2.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.62_0.22_330)] font-bold text-xl text-primary-foreground shadow-lg shadow-primary/30">
              F
            </div>
            <span className="text-2xl font-bold tracking-tight">FinApp</span>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={2}>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Gestiona tus finanzas personales
            </h1>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              FinApp te ayuda a controlar tus ingresos, gastos y suscripciones en un
              solo lugar. Minimalista, rápida y segura.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={3}>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group min-w-[200px] rounded-full px-6"
              )}
            >
              Comenzar ahora
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="size-4" aria-hidden="true" />
              Inicio de sesión seguro con Google
            </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={4}>
          <div className="grid w-full gap-4 pt-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card group rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/12 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
