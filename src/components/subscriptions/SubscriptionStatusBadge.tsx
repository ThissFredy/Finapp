import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/core/models/subscription";

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = {
    ACTIVE: { label: "Activa", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    PAUSED: { label: "Pausada", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-500 hover:bg-gray-100" },
  };
  const { label, className } = config[status];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}
