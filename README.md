# Especificación del Proyecto: Sistema de Gestión Financiera Personal

## 1. Contexto y Alcance

Aplicación web _Full-Stack_ para la gestión centralizada de finanzas personales. El sistema permite registrar y visualizar flujos de dinero en múltiples cuentas, soportando operaciones multimoneda y categorización dinámica. El acceso a la aplicación está completamente protegido mediante autenticación social.

- **Propósito:** Uso personal.
- **Infraestructura:** Presupuesto cero, alta disponibilidad (siempre activa).
- **Autenticación:** Inicio de sesión único (SSO) mediante **Google Cuenta (OAuth 2.0)**.
- **Stack Tecnológico:**
- **Frontend & API:** Next.js (App Router) alojado en Vercel.
- **Backend / Base de Datos / Auth:** Supabase (PostgreSQL + Supabase Auth con Google Provider + Row Level Security).
- **Estilos:** Tailwind CSS.
- **Validación:** Zod + TypeScript.

---

## 2. Módulos e Historias de Usuario

### Módulo 0: Autenticación y Control de Acceso (Google OAuth)

Garantiza el acceso seguro y la privacidad de los datos financieros del usuario.

- **HU-0.1:** Como usuario, quiero iniciar sesión de forma rápida y segura utilizando mi cuenta de Google.
- **HU-0.2:** Como usuario, quiero que la aplicación cree automáticamente mi perfil en la base de datos la primera vez que ingrese con Google.
- **HU-0.3:** Como usuario no autenticado, quiero ser redirigido automáticamente a la página de Login si intento forzar el acceso a las rutas del dashboard.
- **HU-0.4:** Como usuario, quiero poder cerrar mi sesión de manera segura, destruyendo los tokens de acceso y regresando a la pantalla de bienvenida.

### Módulo 1: Gestión de Cuentas (Cajas/Bancos)

Permite al usuario reflejar la realidad de dónde está su dinero (ej. Efectivo, Cuenta de Ahorros, Tarjeta de Crédito).

- **HU-1.1:** Como usuario, quiero crear diferentes cuentas especificando su nombre, tipo y saldo inicial.
- **HU-1.2:** Como usuario, quiero poder editar o desactivar una cuenta si dejo de utilizarla.
- **HU-1.3:** Como usuario, quiero ver el balance total sumado de todas mis cuentas, convertido a mi moneda principal (ej. COP).

### Módulo 2: Categorización Dinámica

Gestión de rubros para clasificar en qué entra o sale el dinero.

- **HU-2.1:** Como usuario, quiero crear categorías personalizadas definiendo un nombre, un ícono y un color.
- **HU-2.2:** Como usuario, quiero distinguir entre categorías exclusivas para "Ingresos" y exclusivas para "Gastos".
- **HU-2.3:** Como usuario, quiero poder editar o eliminar una categoría (re-asignando o manteniendo en el historial las transacciones asociadas).

### Módulo 3: Transacciones (Ingresos, Gastos y Transferencias)

El motor principal de la aplicación para registrar movimientos de dinero.

- **HU-3.1:** Como usuario, quiero registrar un ingreso o gasto indicando monto, moneda de origen, cuenta afectada, categoría, fecha y una descripción opcional.
- **HU-3.2:** Como usuario, quiero registrar transferencias entre mis propias cuentas (ej. pasar de Cuenta de Ahorros a Efectivo) sin que esto afecte mi balance neto global.
- **HU-3.3:** Como usuario, quiero ver un historial paginado de mis transacciones con filtros por fecha, cuenta y categoría.

### Módulo 4: Suscripciones y Gastos Recurrentes

Seguimiento de obligaciones financieras periódicas.

- **HU-4.1:** Como usuario, quiero registrar una suscripción indicando su costo, moneda, frecuencia de cobro (mensual/anual) y fecha del próximo corte.
- **HU-4.2:** Como usuario, quiero visualizar un calendario o lista con los próximos pagos del mes actual.
- **HU-4.3:** Como usuario, quiero un botón rápido para "Registrar pago de este mes", el cual genere automáticamente la transacción correspondiente en el Módulo 3.

### Módulo 5: Dashboard y Analítica

Visualización de la salud financiera.

- **HU-5.1:** Como usuario, quiero ver un gráfico de barras comparando mis Ingresos vs Gastos del mes actual.
- **HU-5.2:** Como usuario, quiero un gráfico circular (Pie chart) que desglose mis gastos por categoría para identificar fugas de capital.
- **HU-5.3:** Como usuario, quiero un resumen de mi patrimonio neto actual distribuido por cuentas.
- **HU-5.4:** Como usuario, quiero ver mis suscripciones activas con la próxima fecha de cobro desde el dashboard.
- **HU-5.5:** Como usuario, quiero ver las últimas transacciones registradas desde el dashboard.

---

## 3. Modelo de Datos (PostgreSQL / Supabase)

Diseño relacional estructurado. La seguridad se gestiona mediante **Políticas RLS (Row Level Security)** en Supabase, vinculando cada registro al `auth.uid()` provisto por el login de Google.

### Enums definidos

| Enum                  | Valores                         | Uso                                                             |
| --------------------- | ------------------------------- | --------------------------------------------------------------- |
| `preferred_currency`  | `COP`, `USD`, `EUR`             | Moneda principal del perfil y de todas las entidades monetarias |
| `account_type`        | `DEBIT`, `CREDIT`, `CASH`       | Tipo de cuenta financiera                                       |
| `account_status`      | `ACTIVE`, `INACTIVE`            | Estado de la cuenta                                             |
| `category_type`       | `INCOME`, `EXPENSE`             | Tipo de categoría                                               |
| `transaction_type`    | `INCOME`, `EXPENSE`, `TRANSFER` | Tipo de transacción                                             |
| `billing_cycle`       | `MONTHLY`, `YEARLY`             | Frecuencia de cobro de suscripción                              |
| `subscription_status` | `ACTIVE`, `PAUSED`, `CANCELLED` | Estado de la suscripción                                        |

### Tablas

- **`auth.users`** (esquema nativo de Supabase Auth, poblado por el flujo de Google)
  - `id` (UUID, PK)
  - `email` (String)
  - `raw_user_meta_data->avatar_url` (String, foto de perfil de Google)
  - `raw_user_meta_data->full_name` (String, nombre completo de Google)

- **`profiles`** (perfil extendido del usuario)
  - `id` (UUID, PK, FK -> `auth.users.id` on delete cascade)
  - `full_name` (String, nullable)
  - `avatar_url` (String, nullable)
  - `preferred_currency` (`preferred_currency`, default `COP`)
  - `created_at` (Timestamp)

- **`accounts`**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> `auth.users.id` on delete cascade)
  - `name` (String, único por usuario)
  - `type` (`account_type`)
  - `status` (`account_status`, default `ACTIVE`)
  - `balance` (Decimal 18,2, default 0)
  - `currency` (`preferred_currency`, default `COP`)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
  - _Constraint:_ `chk_cash_non_negative` — las cuentas `CASH` no pueden tener saldo negativo
  - _Índices:_ `idx_accounts_user_id`, `idx_accounts_user_status`

- **`categories`**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> `auth.users.id` on delete cascade)
  - `name` (String)
  - `type` (`category_type`)
  - `icon` (String, NOT NULL, default `'tag'` — nombre de ícono de lucide-react)
  - `color` (String HEX, default `'#6B7280'`)
  - `deleted_at` (Timestamp, nullable — soft delete)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
  - _Índice único parcial:_ `categories_unique_name_per_type` sobre `(user_id, name, type) where deleted_at is null`
  - _Índice compuesto:_ `idx_categories_user_type_name` sobre `(user_id, type, name) where deleted_at is null`

- **`transactions`**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> `auth.users.id` on delete cascade)
  - `account_id` (UUID, FK -> `accounts.id` on delete restrict, nullable)
  - `from_account_id` (UUID, FK -> `accounts.id` on delete restrict, nullable — para transferencias)
  - `to_account_id` (UUID, FK -> `accounts.id` on delete restrict, nullable — para transferencias)
  - `category_id` (UUID, FK -> `categories.id` on delete set null, nullable)
  - `subscription_id` (UUID, FK -> `subscriptions.id` on delete set null, nullable)
  - `type` (`transaction_type`)
  - `amount` (Decimal 18,2)
  - `currency` (`preferred_currency`, default `COP`)
  - `exchange_rate` (Decimal 18,6, default 1.0)
  - `date` (Timestamp)
  - `description` (Text, nullable)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
  - _Índices:_ `idx_transactions_user_id`, `idx_transactions_user_date`, `idx_transactions_account_id`, `idx_transactions_from_account`, `idx_transactions_to_account`, `idx_transactions_subscription_id`

- **`subscriptions`**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> `auth.users.id` on delete cascade)
  - `name` (String)
  - `amount` (Decimal 18,2)
  - `currency` (`preferred_currency`, default `COP`)
  - `billing_cycle` (`billing_cycle`, default `MONTHLY`)
  - `next_billing_date` (Date)
  - `category_id` (UUID, FK -> `categories.id` on delete set null, nullable)
  - `account_id` (UUID, FK -> `accounts.id` on delete set null, nullable)
  - `status` (`subscription_status`, default `ACTIVE`)
  - `deleted_at` (Timestamp, nullable — soft delete)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
  - _Índice único parcial:_ `subscriptions_unique_name_per_user` sobre `(user_id, name) where deleted_at is null`
  - _Índice compuesto parcial:_ `idx_subscriptions_user_status_billing` sobre `(user_id, status, next_billing_date) where deleted_at is null`

- **`exchange_rates`** (tasas de cambio para conversión multimoneda)
  - `from_currency` (`preferred_currency`)
  - `to_currency` (`preferred_currency`)
  - `rate` (Decimal 18,6)
  - `fetched_at` (Timestamp)
  - _PK:_ `(from_currency, to_currency)`

- **`user_balances`** (caché del patrimonio neto consolidado)
  - `user_id` (UUID, PK, FK -> `auth.users.id` on delete cascade)
  - `total_balance` (Decimal 18,2, default 0)
  - `currency` (`preferred_currency`, default `COP`)
  - `updated_at` (Timestamp)

### Seguridad (RLS)

Todas las tablas de usuario (`profiles`, `accounts`, `categories`, `transactions`, `subscriptions`, `exchange_rates`, `user_balances`) tienen RLS habilitado. Las políticas principales son:

- **Owner-only:** `profiles`, `accounts`, `categories`, `transactions`, `subscriptions`, `user_balances` — el usuario solo ve y muta sus propios registros (`user_id = auth.uid()`).
- **Authenticated read-only:** `exchange_rates` — cualquier usuario autenticado puede leer las tasas.

### Triggers y funciones principales

| Función / Trigger                            | Propósito                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `handle_new_user()` + `on_auth_user_created` | Crea automáticamente el perfil en `public.profiles` al registrarse con Google                   |
| `update_updated_at()`                        | Actualiza `updated_at` en cuentas, categorías, transacciones y suscripciones                    |
| `recalculate_user_balance()`                 | Recalcula y guarda el patrimonio neto consolidado en `user_balances` tras cambios en `accounts` |
| `apply_transaction_balance()`                | Mantiene sincronizados los saldos de `accounts` ante INSERT/UPDATE/DELETE en `transactions`     |

### Funciones RPC (Supabase)

Funciones expuestas a usuarios autenticados para consultas complejas:

- `get_accounts_with_meta()` — cuentas con flag `has_transactions`
- `get_categories_with_meta()` — categorías con flag `has_transactions`
- `get_subscriptions_with_meta()` — suscripciones con metadatos de cuenta/categoría y estado de pago del ciclo
- `get_upcoming_subscription_payments(p_year, p_month)` — pagos próximos del mes
- `get_transactions_paginated(...)` — historial paginado con filtros y joins
- `reassign_category_transactions(p_source_category_id, p_target_category_id)` — reasigna transacciones y elimina categoría origen
- `register_subscription_payment(...)` — registra pago de suscripción, crea transacción y avanza fecha de cobro
- `get_dashboard_monthly_summary()` — totales de ingresos/gastos del mes
- `get_dashboard_expenses_by_category()` — gastos del mes por categoría
- `get_dashboard_net_worth_by_account()` — patrimonio neto por cuenta
- `get_dashboard_subscriptions()` — suscripciones para el dashboard
- `get_dashboard_recent_transactions(p_limit)` — últimas transacciones

---

## 4. Estructura del Proyecto (Arquitectura Híbrida / Pragmatic DDD con `src/`)

El archivo `middleware.ts` interceptará las sesiones generadas por las cookies de Supabase Auth tras el inicio de sesión con Google, protegiendo dinámicamente todo el grupo de rutas `(dashboard)`.

```text
finapp
├── public/                     # Assets estáticos y públicos
│   ├── file.svg
│   └── vercel.svg
│
├── src/                        # Todo el código fuente de la aplicación
│   ├── app/                    # Capa de Presentación (Next.js App Router)
│   │   ├── (auth)/             # Rutas de autenticación
│   │   │   └── login/          # Página de login con el botón "Iniciar sesión con Google"
│   │   │       └── page.tsx
│   │   ├── (dashboard)/        # Rutas protegidas por el middleware
│   │   │   ├── page.tsx        # Dashboard (Métricas y Gráficas)
│   │   │   ├── accounts/       # Gestión de cuentas bancarias
│   │   │   ├── categories/     # Gestión de categorías (Módulo 2)
│   │   │   ├── transactions/   # Gestión de transacciones
│   │   │   └── subscriptions/  # Seguimiento de suscripciones
│   │   ├── api/                # Enrutadores de API para callbacks de OAuth (Supabase)
│   │   │   └── auth/
│   │   │       └── callback/   # Maneja el intercambio del código de intercambio de Google
│   │   │           └── route.ts
│   │   ├── globals.css         # Estilos globales de Tailwind CSS
│   │   └── layout.tsx          # Layout raíz de la aplicación
│   │
│   ├── components/             # Componentes de UI reutilizables
│   │   ├── ui/                 # Botones, inputs, modales base (shadcn/ui)
│   │   │   ├── ColorPicker.tsx
│   │   │   └── IconPicker.tsx
│   │   ├── forms/              # Formularios de negocio
│   │   │   ├── AccountForm.tsx
│   │   │   └── CategoryForm.tsx
│   │   ├── categories/         # Componentes del Módulo 2
│   │   │   ├── CategoryCard.tsx
│   │   │   ├── CategorySelect.tsx
│   │   │   └── DeleteCategoryDialog.tsx
│   │   └── auth/               # Botón de Login de Google, componente de protección visual
│   │
│   ├── core/                   # Capa lógica del negocio y acceso a datos
│   │   ├── models/             # Esquemas de validación (Zod) y tipos de TypeScript
│   │   │   ├── account.ts
│   │   │   ├── category.ts
│   │   │   └── profile.ts
│   │   ├── services/           # Reglas de negocio y orquestación
│   │   │   ├── account.service.ts
│   │   │   ├── auth.client.ts
│   │   │   ├── auth.service.ts
│   │   │   └── category.service.ts
│   │   ├── db/                 # Conectividad y consultas de base de datos
│   │   │   ├── supabase.ts     # Cliente de Supabase para navegador
│   │   │   ├── supabase.server.ts # Cliente de Supabase para Server Components/Actions
│   │   │   └── queries/        # Funciones que ejecutan consultas SQL específicas
│   │   │       ├── account.queries.ts
│   │   │       └── category.queries.ts
│   │   └── utils/              # Funciones auxiliares puras (formateadores, cálculo de tasas)
│   │       └── currency.ts
│   │
│   └── middleware.ts           # Interceptor para control de cookies de Supabase y redirección a /login
│
├── eslint.config.mjs           # Archivos de configuración de herramientas en la raíz
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── README.md
├── tsconfig.json
└── .gitignore

```
