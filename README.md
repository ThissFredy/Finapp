# Especificación del Proyecto: Sistema de Gestión Financiera Personal

## 1. Contexto y Alcance

Aplicación web *Full-Stack* para la gestión centralizada de finanzas personales. El sistema permite registrar y visualizar flujos de dinero en múltiples cuentas, soportando operaciones multimoneda y categorización dinámica. El acceso a la aplicación está completamente protegido mediante autenticación social.

* **Propósito:** Uso personal.
* **Infraestructura:** Presupuesto cero, alta disponibilidad (siempre activa).
* **Autenticación:** Inicio de sesión único (SSO) mediante **Google Cuenta (OAuth 2.0)**.
* **Stack Tecnológico:**
* **Frontend & API:** Next.js (App Router) alojado en Vercel.
* **Backend / Base de Datos / Auth:** Supabase (PostgreSQL + Supabase Auth con Google Provider + Row Level Security).
* **Estilos:** Tailwind CSS.
* **Validación:** Zod + TypeScript.



---

## 2. Módulos e Historias de Usuario

### Módulo 0: Autenticación y Control de Acceso (Google OAuth)

Garantiza el acceso seguro y la privacidad de los datos financieros del usuario.

* **HU-0.1:** Como usuario, quiero iniciar sesión de forma rápida y segura utilizando mi cuenta de Google.
* **HU-0.2:** Como usuario, quiero que la aplicación cree automáticamente mi perfil en la base de datos la primera vez que ingrese con Google.
* **HU-0.3:** Como usuario no autenticado, quiero ser redirigido automáticamente a la página de Login si intento forzar el acceso a las rutas del dashboard.
* **HU-0.4:** Como usuario, quiero poder cerrar mi sesión de manera segura, destruyendo los tokens de acceso y regresando a la pantalla de bienvenida.

### Módulo 1: Gestión de Cuentas (Cajas/Bancos)

Permite al usuario reflejar la realidad de dónde está su dinero (ej. Efectivo, Cuenta de Ahorros, Tarjeta de Crédito).

* **HU-1.1:** Como usuario, quiero crear diferentes cuentas especificando su nombre, tipo y saldo inicial.
* **HU-1.2:** Como usuario, quiero poder editar o desactivar una cuenta si dejo de utilizarla.
* **HU-1.3:** Como usuario, quiero ver el balance total sumado de todas mis cuentas, convertido a mi moneda principal (ej. COP).

### Módulo 2: Categorización Dinámica

Gestión de rubros para clasificar en qué entra o sale el dinero.

* **HU-2.1:** Como usuario, quiero crear categorías personalizadas definiendo un nombre, un ícono y un color.
* **HU-2.2:** Como usuario, quiero distinguir entre categorías exclusivas para "Ingresos" y exclusivas para "Gastos".
* **HU-2.3:** Como usuario, quiero poder editar o eliminar una categoría (re-asignando o manteniendo en el historial las transacciones asociadas).

### Módulo 3: Transacciones (Ingresos, Gastos y Transferencias)

El motor principal de la aplicación para registrar movimientos de dinero.

* **HU-3.1:** Como usuario, quiero registrar un ingreso o gasto indicando monto, moneda de origen, cuenta afectada, categoría, fecha y una descripción opcional.
* **HU-3.2:** Como usuario, quiero registrar transferencias entre mis propias cuentas (ej. pasar de Cuenta de Ahorros a Efectivo) sin que esto afecte mi balance neto global.
* **HU-3.3:** Como usuario, quiero ver un historial paginado de mis transacciones con filtros por fecha, cuenta y categoría.

### Módulo 4: Suscripciones y Gastos Recurrentes

Seguimiento de obligaciones financieras periódicas.

* **HU-4.1:** Como usuario, quiero registrar una suscripción indicando su costo, moneda, frecuencia de cobro (mensual/anual) y fecha del próximo corte.
* **HU-4.2:** Como usuario, quiero visualizar un calendario o lista con los próximos pagos del mes actual.
* **HU-4.3:** Como usuario, quiero un botón rápido para "Registrar pago de este mes", el cual genere automáticamente la transacción correspondiente en el Módulo 3.

### Módulo 5: Dashboard y Analítica

Visualización de la salud financiera.

* **HU-5.1:** Como usuario, quiero ver un gráfico de barras comparando mis Ingresos vs Gastos del mes actual.
* **HU-5.2:** Como usuario, quiero un gráfico circular (Pie chart) que desglose mis gastos por categoría para identificar fugas de capital.
* **HU-5.3:** Como usuario, quiero un resumen de mi patrimonio neto actual distribuido por cuentas.

---

## 3. Modelo de Datos (PostgreSQL / Supabase)

Diseño relacional estructurado. La seguridad se gestiona mediante **Políticas RLS (Row Level Security)** en Supabase, vinculando cada registro al `auth.uid()` provisto por el login de Google.

* **`users`** (Esquema nativo `auth.users` de Supabase, poblador por el flujo de Google)
* `id` (UUID, PK)
* `email` (String)
* `raw_user_meta_data->avatar_url` (String, foto de perfil de Google)
* `raw_user_meta_data->full_name` (String, nombre completo de Google)


* **`accounts`**
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `auth.users.id`)
* `name` (String)
* `type` (Enum: DEBIT, CREDIT, CASH)
* `balance` (Decimal)
* `currency` (String, ej. 'COP', 'USD')


* **`categories`**
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `auth.users.id`)
* `name` (String)
* `type` (Enum: INCOME, EXPENSE)
* `color` (String)


* **`transactions`**
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `auth.users.id`)
* `account_id` (UUID, FK)
* `category_id` (UUID, FK, nullable para transferencias)
* `type` (Enum: INCOME, EXPENSE, TRANSFER)
* `amount` (Decimal)
* `currency` (String)
* `exchange_rate` (Decimal)
* `date` (Timestamp)
* `description` (Text)


* **`subscriptions`**
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `auth.users.id`)
* `name` (String)
* `amount` (Decimal)
* `currency` (String)
* `billing_cycle` (Enum: MONTHLY, YEARLY)
* `next_billing_date` (Date)
* `category_id` (UUID, FK)



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
│   │   │   ├── transactions/   # Gestión de transacciones
│   │   │   ├── accounts/       # Gestión de cuentas bancarias
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
│   │   ├── forms/              # Formularios de negocio (TransactionForm, AccountForm)
│   │   └── auth/               # Botón de Login de Google, componente de protección visual
│   │
│   ├── core/                   # Capa lógica del negocio y acceso a datos
│   │   ├── models/             # Esquemas de validación (Zod) y tipos de TypeScript
│   │   │   ├── transaction.ts
│   │   │   └── account.ts
│   │   ├── services/           # Reglas de negocio y orquestación
│   │   │   ├── transaction.service.ts
│   │   │   └── account.service.ts
│   │   ├── db/                 # Conectividad y consultas de base de datos
│   │   │   ├── supabase.ts     # Inicialización del cliente de Supabase (Browser/Server)
│   │   │   └── queries/        # Funciones que ejecutan consultas SQL específicas
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