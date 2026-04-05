# Geotechnical Insights Hub

Production-ready Next.js web app for geotechnical articles and a scalable geotechnical decision-support tool library.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase Auth (email/password)
- File-based local data store (`/data`)

## Routes
- `/` Home
- `/tools` Geotechnical tool library
- `/tools/[slug]` Tool detail with Calculation + Information tabs
- `/blog` Blog list
- `/blog/[slug]` Blog detail
- `/contact` Contact + newsletter + CV
- `/login` Login page
- `/signup` Sign-up page
- `/account` Protected account page
- `/terms` Terms of Use
- `/disclaimer` Disclaimer

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

## Production Auth (Supabase)

This project uses Supabase Auth for production-safe email/password authentication.

### Required environment variables
Add these to your local `.env.local` and to Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_FROM_EMAIL=hello@yourdomain.com
CONTACT_TO_EMAIL=your-inbox@yourdomain.com
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

### Vercel setup (manual)
1. Open your project in Vercel.
2. Go to `Settings > Environment Variables`.
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `CONTACT_FROM_EMAIL`
   - `CONTACT_TO_EMAIL`
4. Redeploy the project after adding variables.

### What is implemented
- Client Supabase browser client: `lib/supabase/client.ts`
- Server Supabase client: `lib/supabase/server.ts`
- Auth middleware/session refresh + route protection: `middleware.ts`, `lib/supabase/middleware.ts`
- Sign-up page: `/signup`
- Login page: `/login`
- Logout button in header/account
- Protected account page: `/account`
- Callback route for email verification/session exchange: `/auth/callback`
- Contact email action: `app/actions/contact.ts` (Resend-powered, used by `components/contact-form.tsx`)
- Account deletion action: `app/actions/account.ts` (server-side Supabase admin delete using service role key)

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
  newsletter.json
```

## Data Layer
- `data/tools.ts`: tool metadata and engineering content
- `data/articles.json`: article metadata + article body content
- `data/counters.json`: aggregate counters and per-tool/per-article counters
- `data/newsletter.json`: locally stored newsletter emails (mock v1)

Core access functions:
- `lib/data-layer.ts` for tool/article reads
- `lib/counters-store.ts` for resilient file-based counter/newsletter writes
- `app/actions/analytics.ts` for server actions (visit tracking, tool uses, article reads, newsletter subscribe)

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
- Tool outputs are deliberately conservative and simplified. They are intended for education, screening, and engineering discussion rather than final design.
