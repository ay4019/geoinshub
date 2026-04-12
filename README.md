# Geotechnical Insights Hub

Production-ready Next.js web app for geotechnical articles and a scalable geotechnical decision-support tool library.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase Auth (email/password)
- Supabase database for auth, projects, usage quotas, newsletter, contact logs, and production counters
- Local `/data` JSON files only as a development fallback for counters/newsletter

## Routes
- `/` Home
- `/tools` Geotechnical tool library
- `/tools/[slug]` Tool detail with Calculation + Information tabs
- `/blog` Blog list
- `/blog/[slug]` Blog detail
- `/contact` Contact form + personal information panel
- `/account` Unified auth + account workspace (projects, subscription, personal information)
- `/login` Redirects to `/account`
- `/signup` Redirects to `/account`
- `/forgot-password` Password reset request
- `/reset-password` Password reset form
- `/terms` Terms of Use
- `/disclaimer` Disclaimer
- `/privacy-policy` Privacy Policy

## Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build production:
   ```bash
   npm run build
   npm run start
   ```
4. Run the pre-deploy verification gate:
   ```bash
   npm run test
   ```

## Production Auth (Supabase)

This project uses Supabase Auth for production-safe email/password authentication.

### Required environment variables
Add these to your local `.env.local` and to Vercel project settings:

```bash
NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_FROM_EMAIL=hello@yourdomain.com
CONTACT_TO_EMAIL=your-inbox@yourdomain.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MATRIX_MAX_OUTPUT_TOKENS=4096
```

### Supabase setup (manual)
1. Create a Supabase project.
2. Go to `Authentication > Providers > Email` and enable Email provider.
3. In `Authentication > URL Configuration` set:
   - `Site URL`: your production domain (for example `https://your-app.vercel.app`)
   - `Redirect URLs`:
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback`
     - (optional) your custom domain callback URL, e.g. `https://example.com/auth/callback`
4. Keep JWT/session defaults unless you have project-specific requirements.
5. If email confirmation is enabled, users will confirm by email and return through `/auth/callback`.
6. Run the SQL migration in [`supabase/migrations/20260412170000_site_analytics_and_contact_logs.sql`](supabase/migrations/20260412170000_site_analytics_and_contact_logs.sql) so production has the analytics, newsletter, and contact-log tables.

### Vercel setup (manual)
1. Open your project in Vercel.
2. Go to `Settings > Environment Variables`.
3. Add:
   - `NEXT_PUBLIC_SITE_URL` (canonical public URL for SEO: sitemap, Open Graph, `metadataBase`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `CONTACT_FROM_EMAIL`
   - `CONTACT_TO_EMAIL`
4. Redeploy the project after adding variables.

### Membership model (current launch setup)
- Payments are intentionally not enabled yet.
- New users can sign up normally.
- Membership tiers are assigned manually by the site admin from `/admin`.
- Bronze enables cloud projects and report export; higher tiers can be granted manually as needed.

### Production checklist
1. Set all environment variables in Vercel.
2. Apply the Supabase SQL tables/policies for projects and usage data.
3. Apply the migration for site metrics, newsletter subscribers, and contact message logs.
4. In Supabase Auth URL configuration, set the exact production callback URL: `https://your-domain.com/auth/callback`.
5. Ensure your own profile row has `is_admin = true` so `/admin` can manage tiers.
6. Run `npm run test` before each production deployment.
7. Redeploy after env or database changes.

### What is implemented
- Client Supabase browser client: `lib/supabase/client.ts`
- Server Supabase client: `lib/supabase/server.ts`
- Auth middleware/session refresh + route protection: `middleware.ts`, `lib/supabase/middleware.ts`
- Unified account authentication flow on `/account` (login + sign-up toggle)
- `/login` and `/signup` redirect to `/account`
- Logout from account workspace
- Callback route for email verification/session exchange: `/auth/callback`
- Contact email action: `app/actions/contact.ts` (Resend-powered, used by `components/contact-form.tsx`)
- Account deletion action: `app/actions/account.ts` (server-side Supabase admin delete using service role key)
- Account Projects workspace (inside `/account`): project creation, borehole entries, and active selection for tools
- Tools integration: import active borehole inputs and send calculated/profile results to selected projects

### Supabase database tables required for Projects/Boreholes
Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.boreholes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  borehole_id text not null,
  sample_top_depth numeric,
  sample_bottom_depth numeric,
  n_value numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  borehole_id uuid references public.boreholes(id) on delete set null,
  tool_slug text not null,
  tool_title text not null,
  result_title text not null,
  result_payload jsonb not null,
  unit_system text not null default 'metric',
  created_at timestamptz not null default now()
);

create table if not exists public.project_parameters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  borehole_label text,
  sample_depth numeric,
  parameter_code text not null,
  parameter_label text not null,
  value numeric not null,
  unit text,
  source_tool_slug text not null,
  source_result_id uuid not null references public.tool_results(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.boreholes enable row level security;
alter table public.tool_results enable row level security;
alter table public.project_parameters enable row level security;

create policy if not exists "projects_select_own" on public.projects
for select using (auth.uid() = user_id);
create policy if not exists "projects_insert_own" on public.projects
for insert with check (auth.uid() = user_id);
create policy if not exists "projects_update_own" on public.projects
for update using (auth.uid() = user_id);
create policy if not exists "projects_delete_own" on public.projects
for delete using (auth.uid() = user_id);

create policy if not exists "boreholes_select_own" on public.boreholes
for select using (auth.uid() = user_id);
create policy if not exists "boreholes_insert_own" on public.boreholes
for insert with check (auth.uid() = user_id);
create policy if not exists "boreholes_update_own" on public.boreholes
for update using (auth.uid() = user_id);
create policy if not exists "boreholes_delete_own" on public.boreholes
for delete using (auth.uid() = user_id);

create policy if not exists "tool_results_select_own" on public.tool_results
for select using (auth.uid() = user_id);
create policy if not exists "tool_results_insert_own" on public.tool_results
for insert with check (auth.uid() = user_id);
create policy if not exists "tool_results_delete_own" on public.tool_results
for delete using (auth.uid() = user_id);

create policy if not exists "project_parameters_select_own" on public.project_parameters
for select using (auth.uid() = user_id);
create policy if not exists "project_parameters_insert_own" on public.project_parameters
for insert with check (auth.uid() = user_id);
create policy if not exists "project_parameters_update_own" on public.project_parameters
for update using (auth.uid() = user_id);
create policy if not exists "project_parameters_delete_own" on public.project_parameters
for delete using (auth.uid() = user_id);

create index if not exists idx_project_parameters_project_depth
  on public.project_parameters (project_id, borehole_label, sample_depth);
create index if not exists idx_project_parameters_source
  on public.project_parameters (source_result_id);
```

### Integrated parameter layer
- `tool_results`: stores raw saved snapshots (inputs, calculation output, plots).
- `project_parameters`: stores normalised parameter points extracted from saved snapshots.
- Extraction and indexing logic: `lib/project-parameters.ts`
- Save flows (write both raw + normalised): `components/tool-calculator.tsx`
- Project-level matrix viewer: `components/account-projects-panel.tsx`

## Tool System Overview
The tools are now data-driven and split into three layers:
- `data/tools.ts`: tool catalog, input schema, methodology, assumptions, limitations, references, disclaimers
- `lib/tool-calculations.ts`: calculator registry keyed by tool slug
- `components/tool-calculator.tsx`: shared calculator UI, validation, tabs, and result rendering

### Tool Schema
Each tool definition contains:
- `slug`
- `title`
- `category`
- `shortDescription`
- `tags`
- `keywords`
- `featured`
- `inputs[]`
- `information.methodology`
- `information.assumptions[]`
- `information.limitations[]`
- `information.equations[]`
- `information.references[]`
- `information.disclaimer`

### Category Organization
The tool library is organised under:
1. Soil Parameters
2. Soil Classification
3. Bearing Capacity
4. Settlement
5. Earth Pressure & Retaining Structures
6. Pile Foundations
7. Ground Improvement
8. Liquefaction
9. Railway Geotechnics
10. Field & In-Situ Testing
11. Correlations & Empirical Tools

### Suggested File Structure
```text
app/tools/
components/
  tool-calculator.tsx
  tool-catalog.tsx
  tool-card.tsx
  tool-unit-provider.tsx
lib/
  data-layer.ts
  tool-calculations.ts
  tool-units.ts
  types.ts
data/
  tools.ts
  counters.json
  articles.json
```

## Data Layer
- `data/tools.ts`: tool metadata and engineering content
- `data/articles.json`: article metadata + article body content
- `data/counters.json`: aggregate counters and per-tool/per-article counters

Core access functions:
- `lib/data-layer.ts` for tool/article reads
- `lib/counters-store.ts` for resilient file-based counter writes
- `app/actions/analytics.ts` for server actions (visit tracking, tool uses, article reads)

## Add a New Tool
1. Add a new tool definition in `data/tools.ts`.
2. Reuse an existing calculator helper or add a new slug entry in `lib/tool-calculations.ts`.
3. Optionally seed its usage counter in `data/counters.json` under `toolBreakdown`.

## Add a New Blog Article
1. Add a new article object to `data/articles.json` with:
   - unique `slug`
   - `title`, `excerpt`, `date`, `tags`, `thumbnail`, `readTimeMinutes`
   - `content` or structured `blocks`
2. Add matching images in `public/images`.
3. Optionally seed `articleBreakdown` in `data/counters.json`.

## Tool Report Template System
- Report template registry: `lib/tool-report-templates.ts`
- PDF builder (table + plot + optional AI paragraph): `lib/tool-report-pdf.ts`
- AI interpretation action: `app/actions/ai-report.ts`
- Report UI (buttons: `Download PDF Report`, `Analyse with AI`): `components/cu-profile-report-tab.tsx`

### Gemini AI setup for `Analyze with AI`
1. Add `GEMINI_API_KEY=your_key_here` to `.env.local`.
2. Optional: add `GEMINI_MODEL=gemini-2.5-flash` if you want to override the default model later.
3. Restart the dev server after updating environment variables.
4. Open a report-capable tool and click `Analyse with AI`; the button now routes through Gemini on the server.

### Add or update a template for a specific tool
1. Open `lib/tool-report-templates.ts`.
2. Add/update entry by tool slug inside `TOOL_REPORT_TEMPLATES`.
3. Set:
   - `defaultNarrative`: the exact base paragraph you want in PDF output
   - `aiPromptHint` (optional): extra guidance for AI interpretation tone/focus

Example:
```ts
"spt-corrections": {
  defaultNarrative: "Your final template text for this specific tool...",
  aiPromptHint: "Focus on N60 vs (N1)60 profile behaviour and outlier checks.",
}
```

## Where Disclaimers Live
- Global legal pages:
  - `app/terms/page.tsx`
  - `app/disclaimer/page.tsx`
- Tool-specific disclaimers:
  - `data/tools.ts` inside each tool's `information.disclaimer`
- UI-level calculator caveat banner:
  - `components/tool-calculator.tsx`

## Notes
- Counter updates are best-effort and fail silently to protect UX.
- Visit counter increments once per short session using an HTTP-only cookie.
- Contact form sends real email via Resend when env variables are set.
- Tool UI is currently metric-focused in production.
- Tool outputs are deliberately conservative and simplified. They are intended for education, screening, and engineering discussion rather than final design.
