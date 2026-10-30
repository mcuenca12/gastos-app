# Gastos compartidos

App web simple para dividir cuentas con tu grupo: crean un grupo, comparten el
link, registran gastos a medida que pasan y la app calcula automáticamente
quién le debe a quién (con el mínimo número de transferencias posibles).

No tiene login: el "acceso" es el link del grupo (más un PIN opcional). Es el
mismo modelo que usan apps como Tricount o Splitwise en su versión simple —
suficiente para dividir cuentas entre amigos, no pensado para datos sensibles.

## 1. Crear el proyecto en Supabase

Supabase es una base de datos Postgres alojada, con una capa que te da una
API lista para usar desde el navegador (sin tener que escribir un backend
aparte). El plan gratuito alcanza de sobra para esta app.

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (puedes usar
   tu cuenta de GitHub).
2. Crea un **New Project**. Elige una contraseña de base de datos (no la vas
   a necesitar para esta app, pero guárdala igual) y una región cercana
   (por ejemplo, `South America (São Paulo)`).
3. Cuando el proyecto esté listo, ve a **SQL Editor** (menú izquierdo) →
   **New query**, pega el contenido del archivo `supabase/schema.sql` de este
   proyecto y dale **Run**. Esto crea las cuatro tablas que la app necesita
   (`groups`, `members`, `expenses`, `expense_splits`).
4. Ve a **Project Settings → API**. Ahí vas a encontrar dos valores que
   necesitas:
   - **Project URL** → va en `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Esta "anon key" es pública por diseño (es la misma que usa el navegador de
   cualquiera que entre a la app), la seguridad real la dan las políticas de
   Row Level Security que ya vienen en `schema.sql`.

## 2. Configurar el proyecto en tu computador

```bash
cd gastos-app
cp .env.local.example .env.local
```

Abre `.env.local` y pega ahí la URL y la anon key del paso anterior.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` — ya deberías poder crear un grupo y agregar
gastos de prueba.

## 3. Desplegar en Vercel (para tener un link real que puedas compartir)

Vercel es la plataforma de los creadores de Next.js: conectas tu repo de
GitHub y cada vez que haces push, te despliega la app automáticamente en una
URL pública, gratis para proyectos personales.

1. Sube este proyecto a un repositorio de GitHub (`git init`, `git add .`,
   `git commit`, crea el repo en GitHub y haz push).
2. Ve a [vercel.com](https://vercel.com), inicia sesión con GitHub y dale
   **Add New → Project**, selecciona el repo.
3. En **Environment Variables**, agrega las mismas dos variables de tu
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Dale **Deploy**. En un par de minutos tienes una URL tipo
   `gastos-app-tuusuario.vercel.app` para compartir con tu grupo.

## Estructura del proyecto

- `app/page.tsx` — pantalla de inicio: crear grupo / entrar a uno existente.
- `app/grupo/[id]/GroupClient.tsx` — pantalla principal del grupo: miembros,
  formulario de gasto, historial y saldos.
- `lib/balances.ts` — la lógica de cálculo: saldo neto por persona y
  simplificación de deudas (algoritmo goloso que minimiza transferencias).
- `supabase/schema.sql` — el esquema de base de datos y las políticas de
  acceso.

## Ideas para extender

- Repartos desiguales (no todos pagan lo mismo de un gasto).
- Categorías de gasto y un resumen por categoría.
- Notificación por WhatsApp/Telegram cuando alguien agrega un gasto.
- Exportar el historial a PDF o Excel al final del viaje/mes.
