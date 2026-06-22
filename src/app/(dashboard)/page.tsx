export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Bienvenido a FinApp. Desde aquí podrás gestionar tus finanzas
        personales.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">
            Resumen
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Próximamente: visualiza el resumen de tus cuentas.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">
            Transacciones
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Próximamente: registro y seguimiento de transacciones.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">
            Suscripciones
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Próximamente: control de suscripciones recurrentes.
          </p>
        </div>
      </div>
    </div>
  );
}
