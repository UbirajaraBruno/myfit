# MyFit — Meu treino, minha evolução

MyFit is a standalone workout tracker with email registration, sign-in, password recovery, workout history, progress, and private measurements.

## Private data

Authentication and storage use Supabase. Each account stores its own `myfit_data` row, protected by PostgreSQL row-level security. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as build variables in Cloudflare. Never put a Supabase service-role key in the browser or repository.

## Cloudflare Workers build

- Build command: `npm run build:standalone`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Required build variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`

The standalone build omits the ChatGPT Sites sign-in and data integrations. Cloudflare assigns the Worker a public `workers.dev` URL after a successful deploy.

## Local build

Use Node.js 22 or newer, then run `npm install` and `npm run build:standalone`.

