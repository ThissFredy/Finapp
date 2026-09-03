import { BarChart3 } from "lucide-react";

interface DashboardEmptyStateProps {
  title: string;
  message: string;
}

export function DashboardEmptyState({
  title,
  message,
}: DashboardEmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-3xl border-dashed p-8 text-center animate-fade-in-up">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/12">
        <BarChart3 className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
    </div>
  );
}
