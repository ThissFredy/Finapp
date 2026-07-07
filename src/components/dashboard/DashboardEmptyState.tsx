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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center animate-fade-in-up">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
    </div>
  );
}
