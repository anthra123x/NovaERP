# Modulo de Autenticacion y Control de Acceso (Auth)

## 1. Proposito y alcance
El modulo de autenticacion gestiona la identidad de usuarios, sesiones de trabajo y politicas de control de acceso (RBAC) en Nova ERP. Es responsable de la integracion del lado del servidor con Supabase Auth SSR, la sincronizacion automatica de usuarios en la tabla `users` de PostgreSQL (Neon), el cierre de sesion seguro, la proteccion de Server Actions administrativas (`requireAuth`, `requireAdmin`), y la gestion de cuentas de operadores y cajeros.

## 2. Contratos y API
### Server Actions Principales (`auth.actions.ts`)
- `getCurrentUser: () => Promise<AuthenticatedUser | null>`
  - Funcion memoizada por peticion mediante `React.cache()` que recupera el usuario autenticado actual desde Supabase Auth y sincroniza sus datos en la base de datos PostgreSQL local.
- `requireAuth(): Promise<AuthenticatedUser>`
  - Valida la existencia de sesion activa. Si no existe usuario autenticado, redirige inmediatamente a `/login`.
- `requireAdmin(): Promise<AuthenticatedUser>`
  - Valida la sesion y comprueba que el usuario cuente con privilegios de administrador.
- `logout(): Promise<void>`
  - Invalida la sesion en Supabase Auth, purga cookies de sesion y redirige a `/login`.
- `ensureUserExists(email: string, name: string): Promise<ServerActionResult>`
  - Garantiza la existencia del registro en la tabla `users` vinculada a Supabase Auth.
- `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`:
  - Operaciones CRUD de administracion de usuarios para administradores.

## 3. Dependencias
- Consume:
  - `@/lib/supabase-server`: Cliente Supabase configurado para SSR con cookies de Next.js (`createSupabaseServerAction`).
  - `@/lib/prisma`: Instancia de Prisma Client para persistencia de usuarios en `users`.
  - `next/navigation`: Metodo `redirect()` para control de flujo de autenticacion.
  - `react`: Funcion `cache()` para deduplicacion de peticiones en ciclo de renderizado.
- Proveedor de:
  - Consumido transversalmente por todas las Server Actions del sistema (`sales`, `inventory`, `web`, `dashboard`, `clients`, `reports`, `settings`, etc.) a traves de `requireAuth()` y `requireAdmin()`.
  - Consumido por el layout principal (`src/components/layout/header.tsx`) para mostrar el perfil y avatar del usuario activo.

## 4. Mapa de archivos
- `src/modules/auth/auth.actions.ts`: Logica completa de autenticacion, resolucion de sesion, sincronizacion de perfiles y autorizacion basada en roles.

## 5. Logica y flujo
1. Durante la ejecucion de Server Components o Server Actions, se invoca `getCurrentUser()`.
2. Debido a la envoltura con `React.cache()`, multiples llamadas dentro del mismo ciclo de render de una peticion HTTP comparten el resultado de la primera resolucion sin consultar repetidamente a Supabase ni a PostgreSQL.
3. Se invoca `supabase.auth.getUser()`. Si la sesion es valida, se consulta la base de datos local `users`.
4. Si el usuario existe en Supabase pero aun no se encuentra en `users`, se realiza un `upsert` automatico para garantizar integridad referencial con ventas, abonos y movimientos de stock.
5. `requireAuth()` evalua el resultado de `getCurrentUser()`; si es nulo, dispara `redirect('/login')`.

## 6. Decisiones de diseno y gotchas
- Memoizacion por peticion (`React.cache`): En Next.js App Router, tanto el layout principal, como el encabezado de navegacion y la pagina Server Component pueden invocar `getCurrentUser()` o `requireAuth()`. Sin memoizacion, cada componente disparaba una llamada de red independiente hacia el servicio de Supabase Auth y consultas redundantes a Neon. Al envolver `getCurrentUser` con `React.cache()`, la verificacion se realiza una sola vez por renderizado de peticion.
- Separacion con Middleware: El archivo `proxy.ts` en la raiz actua como middleware SSR validando la cookie `sb-*` antes de que la peticion alcance las rutas protegidas. `auth.actions.ts` complementa la autorizacion a nivel de Server Action y Server Component.

## 7. Estado y ultimos cambios
- Incorporacion de `React.cache()` sobre `getCurrentUser` para deduplicacion automatica de consultas de sesion durante el renderizado de componentes de servidor.
- Verificacion de cumplimiento de tipos y compatibilidad con directiva `'use server'`.

## 8. Como verificar
- Comprobar tipos estaticos:
  ```bash
  npm run typecheck
  ```
- Comprobar linter:
  ```bash
  npm run lint
  ```
- Ejecutar suite general de pruebas:
  ```bash
  npm test
  ```
