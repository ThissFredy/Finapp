import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/core/models/subscription";

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = {
    ACTIVE: {
      label: "Activa",
      className: "bg-income/12 text-income hover:bg-income/20",
    },
    PAUSED: {
      label: "Pausada",
      className:
        "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
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
