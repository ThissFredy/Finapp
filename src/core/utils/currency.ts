import type { Currency } from "@/core/models/account";

const localeMap: Record<Currency, string> = {
  COP: "es-CO",
  USD: "en-US",
  EUR: "es-ES",
};

export function formatCurrency(
  amount: number,
  currency: Currency,
  compact: boolean = false
): string {
  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(amount);
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "hace menos de un minuto";
  if (diffMins < 60) return `hace ${diffMins} minutos`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} días`;
}
