import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/core/models/subscription";

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = {
    ACTIVE: {
      label: "Activa",
      className:
        "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    PAUSED: {
      label: "Pausada",
      className:
        "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400",
    },
    CANCELLED: {
      label: "Cancelada",
      className:
        "bg-muted text-muted-foreground hover:bg-muted",
    },
  };
  const { label, className } = config[status];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}
