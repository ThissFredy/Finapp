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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-emerald-500/[0.04] blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-500/[0.04] blur-3xl" />
      </div>

      <main className="flex max-w-2xl flex-col items-center gap-10 text-center">
        <FadeIn direction="up" delay={1}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background font-bold text-xl shadow-sm">
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
                "group min-w-[200px] gap-2 rounded-full px-6"
              )}
            >
              Comenzar ahora
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Inicio de sesión seguro con Google
            </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={4}>
          <div className="grid w-full gap-4 pt-4 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card/50 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md"
                style={{ animationDelay: `${180 + index * 60}ms` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10">
                  <feature.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
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
