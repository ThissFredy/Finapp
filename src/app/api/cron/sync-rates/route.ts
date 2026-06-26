import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Verificar autorización (Vercel Cron envía CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch tasas desde API gratuita (open.er-api.com, sin API key)
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch exchange rates" }), { status: 502 });
  }
  const data = await response.json();
  if (!data || typeof data.rates !== "object") {
    return new Response(JSON.stringify({ error: "Invalid exchange rates response" }), { status: 502 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const currencies = ["COP", "USD", "EUR"] as const;
  const rates: Array<{
    from_currency: string;
    to_currency: string;
    rate: number;
    fetched_at: string;
  }> = [];

  for (const from of currencies) {
    for (const to of currencies) {
      if (from === to) {
        rates.push({ from_currency: from, to_currency: to, rate: 1, fetched_at: new Date().toISOString() });
      } else {
        const fromRate = from === "USD" ? 1 : data.rates[from];
        const toRate = to === "USD" ? 1 : data.rates[to];
        rates.push({ from_currency: from, to_currency: to, rate: toRate / fromRate, fetched_at: new Date().toISOString() });
      }
    }
  }

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(rates, { onConflict: "from_currency,to_currency" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
