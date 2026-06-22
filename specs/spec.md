# Spec — Módulo 0: Autenticación y Control de Acceso (Google OAuth)

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 0 — Autenticación y Control de Acceso
> **Historias de Usuario:** HU-0.1, HU-0.2, HU-0.3, HU-0.4
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth)
> **Fecha:** 2026-06-21

---

## 1. Resumen

Módulo de autenticación y control de acceso mediante **Google OAuth 2.0** con Supabase Auth. Incluye auto-creación de perfil de usuario, protección de rutas privadas vía middleware, y cierre de sesión seguro.

Cubre las siguientes historias de usuario:

- **HU-0.1:** Inicio de sesión rápido y seguro con cuenta de Google.
- **HU-0.2:** Creación automática del perfil en la base de datos en el primer ingreso.
- **HU-0.3:** Redirección automática a `/login` para usuarios no autenticados que intenten acceder a rutas protegidas.
- **HU-0.4:** Cierre de sesión seguro, destruyendo tokens y regresando a la pantalla de bienvenida.

---

## 2. Asunciones Validadas

1. Existe una página pública de bienvenida/landing en `/` con branding de FinApp y CTA hacia `/login`. Un usuario autenticado que visite `/` es redirigido al dashboard.
2. Se crea una tabla `public.profiles` poblada automáticamente por un *trigger* de base de datos cuando un nuevo usuario aparece en `auth.users`.
3. La moneda preferida por defecto al auto-crear el perfil es **COP (Peso Colombiano)**.
4. `/login` muestra el branding de FinApp y únicamente el botón "Iniciar sesión con Google". No existe formulario de email/contraseña.
5. Tras autenticación exitosa, el usuario es redirigido al **dashboard**.
6. La sesión persiste entre reinicios del navegador (refresh token en cookie httpOnly). No hay expiración por inactividad.
7. Cada cuenta de Google es un usuario independiente con datos financieros aislados por RLS (`auth.uid()`).
8. El logout se ejecuta desde un **menú de usuario** (avatar + nombre) en el *header* del *layout* del dashboard.
9. El logout es **inmediato** al hacer clic (sin diálogo de confirmación).
10. Scopes de Google solicitados: únicamente `openid`, `email`, `profile`.
11. Si el flujo OAuth falla, se redirige a `/login` con un mensaje de error visible.
12. La edición del perfil **no** está incluida en el Módulo 0.

---

## 3. Tracks de Implementación Paralela

El módulo se divide en dos *tracks* independientes que pueden ejecutarse en paralelo mediante subagentes.

### Track A — Backend (Supabase)

Responsable de la capa de datos, autenticación y seguridad a nivel base de datos.

**A.1. Migración — Tabla `public.profiles`**

```sql
create type public.preferred_currency as enum ('COP', 'USD', 'EUR');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_currency public.preferred_currency not null default 'COP',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
```

**A.2. Trigger — Auto-creación de perfil**

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**A.3. Configuración del Provider Google en Supabase Auth**
- Habilitar Google como proveedor OAuth en el dashboard de Supabase.
- Configurar Client ID y Client Secret de Google Cloud Console.
- Scopes: `openid`, `email`, `profile`.
- Redirect URL en Google Cloud Console: `https://<supabase-project>.supabase.co/auth/v1/callback`.
- Site URL en Supabase: `{SITE_URL}` (ej. `http://localhost:3000` en desarrollo).
- Redirect URLs permitidas: `{SITE_URL}/api/auth/callback`.

**A.4. Advisors**
- Tras aplicar la migración, ejecutar `supabase_get_advisors` (security) para verificar que no haya vulnerabilidades (RLS habilitada, sin políticas permissivas excesivas).

---

### Track B — Frontend (Next.js)

Responsable de la capa de presentación, enrutamiento, middleware y servicios de cliente.

**B.1. Clientes Supabase — `core/db/supabase.ts`**

```typescript
// Cliente para componentes cliente (browser)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// Cliente para Server Components / Route Handlers / Server Actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClientInstance() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore
            // if middleware refreshes sessions
          }
        },
      },
    }
  );
}
```

**B.2. Middleware — `src/middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response.cookies.set(name, value);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Rutas protegidas: (dashboard)/*
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard')
    || request.nextUrl.pathname.startsWith('/transactions')
    || request.nextUrl.pathname.startsWith('/accounts')
    || request.nextUrl.pathname.startsWith('/subscriptions');

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirigir autenticados lejos de /login y /
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/') && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.delete('from');
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**B.3. Páginas**

| Ruta | Archivo | Tipo | Descripción |
|------|---------|------|-------------|
| `/` | `src/app/page.tsx` | Pública | Landing con branding + CTA a `/login`. Server Component; redirect a `/dashboard` si hay sesión. |
| `/login` | `src/app/(auth)/login/page.tsx` | Pública | Branding + botón Google. Server Component; redirect a `/dashboard` si hay sesión. |
| `/api/auth/callback` | `src/app/api/auth/callback/route.ts` | API Route | Intercambia `code` por sesión, redirige a `/dashboard` (o a `from` si existe). |
| `/dashboard` | `src/app/(dashboard)/page.tsx` | Protegida | Placeholder del dashboard (M0). |
| — | `src/app/(dashboard)/layout.tsx` | Protegida | Layout con `header` + `UserMenu`. |

**B.4. Componentes UI**

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| `GoogleLoginButton` | `src/components/auth/GoogleLoginButton.tsx` | Client Component. Botón que dispara `signInWithGoogle()`. Muestra estado de carga. |
| `UserMenu` | `src/components/auth/UserMenu.tsx` | Client Component. Dropdown con avatar + nombre + acción logout. |
| `Button` | `src/components/ui/button.tsx` | Botón base (shadcn/ui). |
| `Avatar` | `src/components/ui/avatar.tsx` | Avatar base (shadcn/ui). |
| `DropdownMenu` | `src/components/ui/dropdown-menu.tsx` | Dropdown base (shadcn/ui). |

**B.5. Servicios — `core/services/auth.service.ts`**

```typescript
// Operaciones cliente
export async function signInWithGoogle(): Promise<void>;
export async function signOut(): Promise<void>;

// Operaciones servidor
export async function getServerSession(): Promise<AuthSession | null>;
export async function getServerProfile(): Promise<Profile | null>;
```

**B.6. Modelos — `core/models/profile.ts`**

```typescript
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  preferred_currency: z.enum(['COP', 'USD', 'EUR']).default('COP'),
  created_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const AuthSessionSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
  profile: ProfileSchema.nullable(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;
```

---

## 4. Endpoints / Rutas

| Ruta | Método | Tipo | Auth | Descripción |
|------|--------|------|------|-------------|
| `/` | GET | Pública | Opcional | Landing; redirect a `/dashboard` si hay sesión |
| `/login` | GET | Pública | Opcional | Botón Google; redirect a `/dashboard` si hay sesión |
| `/api/auth/callback` | GET | API Route | Pública | Intercambia `code` por sesión, redirige a `/dashboard` o `from` |
| `/dashboard` | GET | Protegida | Requerida | Dashboard principal (placeholder en M0) |
| `/logout` | POST | Server Action | Requerida | Destruye sesión, redirige a `/` |

---

## 5. DTOs / Esquemas

### `Profile`

```typescript
type Profile = {
  id: string;                  // UUID, coincide con auth.users.id
  full_name: string | null;    // desde Google
  avatar_url: string | null;   // desde Google
  preferred_currency: 'COP' | 'USD' | 'EUR';
  created_at: string;          // ISO 8601
};
```

### `AuthSession`

```typescript
type AuthSession = {
  user: {
    id: string;        // UUID
    email: string;
  };
  profile: Profile | null;
};
```

### Parámetros de flujo OAuth

```typescript
// signInWithGoogle
{
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
    scopes: 'openid email profile',
  }
}
```

---

## 6. Componentes UI — Detalle

### `GoogleLoginButton`

- **Tipo:** Client Component (`'use client'`).
- **Props:** `{ redirectTo?: string }` (default: `/api/auth/callback`).
- **Estado:** `idle` | `loading` | `error`.
- **Comportamiento:**
  - Al click: llama `signInWithGoogle()`.
  - Muestra spinner durante `loading`.
  - Si error: muestra mensaje inline "No se pudo iniciar sesión con Google. Inténtalo de nuevo."
- **Estilos:** Botón blanco con borde, icono de Google a la izquierda, texto "Iniciar sesión con Google".

### `UserMenu`

- **Tipo:** Client Component (`'use client'`).
- **Ubicación:** Header del `(dashboard)/layout.tsx`.
- **Contenido:**
  - Trigger: `Avatar` (foto de Google) + nombre del usuario.
  - Items del dropdown:
    - Email del usuario (deshabilitado, solo informativo).
    - Separador.
    - "Cerrar sesión" → invoca `signOut()` → redirect a `/`.
- **Estilos:** Dropdown alineado a la derecha, avatar redondeado 32px.

### `Button`, `Avatar`, `DropdownMenu`

- Componentes base de shadcn/ui.
- Instalados vía `pnpm dlx shadcn@latest add button avatar dropdown-menu`.

---

## 7. Flujos Clave

### Flujo 1 — Login con Google (HU-0.1)

```
Usuario click "Iniciar sesión con Google"
  → signInWithGoogle({ redirectTo: /api/auth/callback })
  → Redirección a Google consent screen
  → Usuario concede permisos (openid, email, profile)
  → Google redirige a Supabase callback
  → Supabase intercambia code → session
  → Supabase redirige a /api/auth/callback?code=...
  → Route Handler intercambia code por sesión (set cookies)
  → Redirect a /dashboard (o ?from=... si existía)
```

### Flujo 2 — Auto-creación de perfil (HU-0.2)

```
Nuevo usuario en auth.users (primer login con Google)
  → Trigger on_auth_user_created dispara
  → handle_new_user() inserta en public.profiles:
      id = new.id
      full_name = raw_user_meta_data->>'full_name'
      avatar_url = raw_user_meta_data->>'avatar_url'
      preferred_currency = 'COP' (default)
  → Fila disponible para SELECT vía RLS (id = auth.uid())
```

### Flujo 3 — Protección de rutas (HU-0.3)

```
Request a /dashboard (o cualquier ruta protegida)
  → middleware.ts intercepta
  → supabase.auth.getUser()
  → Si NO hay user:
      → redirect /login?from=/dashboard
  → Si hay user:
      → permite request (refresh token si es necesario)
```

### Flujo 4 — Logout (HU-0.4)

```
Usuario click "Cerrar sesión" en UserMenu
  → signOut() → supabase.auth.signOut()
  → Cookies de sesión destruidas
  → router.push('/')
  → Usuario en pantalla de bienvenida
```

### Flujo 5 — Error de OAuth

```
OAuth falla o usuario niega permisos
  → Supabase redirige a /api/auth/callback?error=...
  → Route Handler detecta error
  → Redirect /login?error=auth_failed
  → /login muestra mensaje de error visible
```

---

## 8. Criterios de Aceptación

### HU-0.1 — Login con Google

- [ ] Existe un botón "Iniciar sesión con Google" en `/login`.
- [ ] Al hacer clic, se inicia el flujo OAuth de Google.
- [ ] Tras conceder permisos, el usuario es redirigido a `/dashboard`.
- [ ] La sesión persiste tras cerrar y reabrir el navegador.
- [ ] Si el flujo falla, se muestra un mensaje de error en `/login`.

### HU-0.2 — Auto-creación de perfil

- [ ] Tras el primer login exitoso, existe una fila en `public.profiles` con `id = auth.uid()`.
- [ ] `full_name` y `avatar_url` coinciden con los datos de Google.
- [ ] `preferred_currency` es `'COP'` por defecto.
- [ ] El trigger `on_auth_user_created` está activo y funciona.

### HU-0.3 — Protección de rutas

- [ ] Acceder a `/dashboard` sin sesión redirige a `/login?from=/dashboard`.
- [ ] Tras login, el usuario es redirigido a la ruta original (`from`).
- [ ] Acceder a `/login` o `/` con sesión activa redirige a `/dashboard`.
- [ ] El middleware no interfiere con assets estáticos (`_next/*`, imágenes).

### HU-0.4 — Logout

- [ ] El `UserMenu` en el header del dashboard muestra avatar + nombre.
- [ ] Al hacer clic en "Cerrar sesión", la sesión se destruye inmediatamente.
- [ ] El usuario es redirigido a `/` (pantalla de bienvenida).
- [ ] Tras logout, acceder a `/dashboard` redirige a `/login`.

---

## 9. Dependencias y Riesgos

### Dependencias de paquetes

```json
{
  "@supabase/ssr": "latest",
  "@supabase/supabase-js": "latest",
  "zod": "latest"
}
```

Instalación: `pnpm add @supabase/ssr @supabase/supabase-js zod`

### Variables de entorno requeridas

| Variable | Uso | Ámbito |
|----------|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Cliente + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Cliente + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo migraciones/triggers) | Server (no expone al cliente) |
| `SITE_URL` | URL base de la app (ej. `http://localhost:3000`) | Configuración Supabase |

Archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SITE_URL=http://localhost:3000
```

### Riesgos

1. **Credenciales Google OAuth:** Requiere crear un proyecto en Google Cloud Console, configurar OAuth Client ID/Secret y añadir las URLs de callback de Supabase. Bloquea el testing end-to-end hasta completarse.
2. **Cookies en Server Components:** El `createServerClient` debe manejar correctamente el caso donde `cookies().set()` falla en Server Components (delegando al middleware el refresh). Documentado en B.1.
3. **Matcher del middleware:** Debe excluir assets estáticos para no degradar el rendimiento. Configurado en B.2.
4. **Trigger `security definer`:** La función `handle_new_user` usa `security definer` para poder insertar en `public.profiles` desde el contexto de `auth.users`. Debe limitar `search_path` a `public` para evitar ataques de search path.

---

## 10. Orden de Implementación Sugerido

Dado que los tracks son paralelizables, se sugiere el siguiente orden dentro de cada track:

**Track A (Backend):**
1. Crear migración `profiles` + enum + RLS policies.
2. Crear función `handle_new_user` + trigger.
3. Verificar con `supabase_get_advisors` (security).
4. Configurar provider Google en Supabase Auth dashboard.

**Track B (Frontend):**
1. Instalar dependencias (`@supabase/ssr`, `@supabase/supabase-js`, `zod`, shadcn/ui).
2. Crear `core/db/supabase.ts` (browser + server clients).
3. Crear `core/models/profile.ts` (Zod + tipos).
4. Crear `core/services/auth.service.ts`.
5. Crear `src/middleware.ts`.
6. Crear `src/app/api/auth/callback/route.ts`.
7. Crear `src/app/page.tsx` (landing).
8. Crear `src/app/(auth)/login/page.tsx` + `GoogleLoginButton`.
9. Crear `src/app/(dashboard)/layout.tsx` + `UserMenu`.
10. Crear `src/app/(dashboard)/page.tsx` (placeholder).
11. Configurar `.env.local`.

**Punto de sincronización:** Ambos tracks deben completar antes del testing end-to-end (login real con Google).

---

## 11. Definición de Hecho (Definition of Done)

- [ ] Migración aplicada en Supabase (tabla `profiles` + trigger + RLS).
- [ ] Provider Google habilitado en Supabase Auth.
- [ ] Variables de entorno configuradas en `.env.local`.
- [ ] Flujo login → dashboard funciona end-to-end.
- [ ] Auto-creación de perfil verificada en base de datos.
- [ ] Protección de rutas verificada (redirect a `/login`).
- [ ] Logout funciona y redirige a `/`.
- [ ] No hay advisors de seguridad críticos.
- [ ] Código pasa `pnpm lint` y `pnpm build`.
