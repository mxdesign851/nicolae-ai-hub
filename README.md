# ReplyZen

Production-ready multi-tenant SaaS for AI-powered customer review reply workflows.

- Brand: **ReplyZen**
- Domain branding: **reply-zen.com**
- Stack: **Next.js 14 App Router + React 18 + TypeScript + PostgreSQL + Prisma + Tailwind + NextAuth**

---

## What this app does

ReplyZen helps businesses and agencies manage imported reviews (Google/Facebook/Yelp/Trustpilot/manual), generate high-quality AI replies, apply approval workflows, and track plan-based usage with Stripe + PayPal subscriptions.

### Included features

- Multi-tenant Workspaces with membership roles: **OWNER / ADMIN / MEMBER**
- Plans with server-side enforced limits: **Free / Pro / Agency**
- Review inbox with filters: status, rating, sentiment, tags, source, date range
- Manual review add + CSV import
- AI reply generation with:
  - provider selection (`openai`, `claude`, `gemini`)
  - length selection (`short`, `medium`, `long`)
  - optional language target
  - escalation rules for low-rating/complaint content
- Brand Voice at workspace or location level (Pro+)
- Approval workflow (Member drafts, Admin/Owner approves)
- Full review audit trail + generation metadata
- Tag + sentiment AI suggestion endpoint
- CSV export + copy-to-clipboard flow (Agency exports)
- Workspace analytics dashboard
- Stripe + PayPal subscription routes + webhook handlers
- Payment-failure grace handling and auto-downgrade to Free
- Privacy and Terms template pages

---

## Plan limits

| Plan | Workspaces | Locations | AI gens / month | Brand Voice | Approval | Exports |
|---|---:|---:|---:|---|---|---|
| Free | 1 | 1 | 50 | No | No | No |
| Pro | 5 | 3 | 1,000 | Yes | Yes | No |
| Agency | Unlimited | Unlimited | 10,000 | Yes | Yes | Yes |

All limits are enforced server-side in `lib/tenant.ts`.

---

## Architecture highlights

### Multi-tenant data model

Core Prisma models:
- `User`
- `Workspace`
- `WorkspaceMembership`
- `Location`
- `Review`
- `BrandVoice`
- `ReplyGeneration`
- `ReviewAuditLog`
- `SourceConnection`
- `Subscription`

### Security controls

- Server-side workspace authorization on all protected endpoints
- Role-based approval and team management checks
- AI endpoint rate limiting (`lib/rate-limit.ts`)
- Input sanitization helpers (`lib/sanitize.ts`)
- No raw API keys on client

### AI provider abstraction

`lib/ai.ts` defines:
- `interface AIProvider { generateReply(input): output }`
- OpenAI implementation
- Claude (Anthropic SDK) implementation
- Gemini (Google Generative AI SDK) implementation

---

## Folder structure (key paths)

```txt
app/
  page.tsx                      # Marketing landing
  sign-in/page.tsx
  sign-up/page.tsx
  privacy/page.tsx
  terms/page.tsx
  app/page.tsx                  # Workspace bootstrap redirect/create
  w/[workspaceId]/
    layout.tsx
    inbox/page.tsx
    reviews/[reviewId]/page.tsx
    brand-voice/page.tsx
    locations/page.tsx
    team/page.tsx
    billing/page.tsx
    exports/page.tsx
    analytics/page.tsx
    sources/page.tsx
  api/
    auth/register/route.ts
    workspaces/route.ts
    workspaces/[workspaceId]/{locations,team,brand-voice,analytics,exports/csv,sources}/route.ts
    reviews/{route.ts,import/route.ts,generate/route.ts,[reviewId]/*}
    subscriptions/{stripe,paypal}/route.ts
    subscriptions/{stripe,paypal}/webhook/route.ts
prisma/
  schema.prisma
  seed.ts
docs/
  http-examples.http
public/
  logo.svg
  sample-reviews.csv
```

---

## Setup Steps

### 1) Install

```bash
cp .env.example .env
npm install
```

### 2) Start PostgreSQL

Use local Postgres or Docker:

```bash
docker compose up -d db
```

### 3) Prisma migrate + generate + seed

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

Seed behavior:
- `npm run db:seed` -> **safe upsert mode** (does not wipe existing data)
- `npm run db:seed:reset` -> hard reset + reseed demo data

### 4) Start app

```bash
npm run dev
```

Open: `http://localhost:3000`

Seeded users:
- `owner@example.com` / `password123`
- `member@example.com` / `password123`
- `superadmin@reply-zen.com` / `password123`
- `premium@reply-zen.com` / `password123`

---

## Docker run

```bash
docker compose up --build
```

App: `http://localhost:3000`

---

## Env vars

See `.env.example` for all required keys:

- Core: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`
- Optional Railway helper: `RAILWAY_PUBLIC_DOMAIN`
- AI: `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_PLAN_PRO`, `PAYPAL_PLAN_AGENCY`
- Optional cron protection: `CRON_SECRET`

---

## Stripe / PayPal webhook notes

### Stripe
- Endpoint: `POST /api/subscriptions/stripe/webhook`
- Recommended local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/subscriptions/stripe/webhook
  ```

### PayPal
- Endpoint: `POST /api/subscriptions/paypal/webhook`
- Signature verification is marked TODO in code for production hardening.

---

## CSV import format

Download template:
- `public/sample-reviews.csv` (`/sample-reviews.csv` in browser)

Required columns:
- `name,rating,date,text,source,location,url`

Optional:
- `language,tags`

---

## API examples (Postman / HTTP)

See:
- `docs/http-examples.http`

Key routes:
- `POST /api/auth/register`
- `GET/POST /api/workspaces`
- `POST /api/reviews/import`
- `POST /api/reviews/generate`
- `POST /api/reviews/:id/suggest`
- `POST /api/reviews/:id/approve`
- `GET /api/workspaces/:id/exports/csv`
- `POST /api/subscriptions/stripe`
- `POST /api/subscriptions/paypal`

---

## Deploying to Railway or Vercel

### Railway
1. Create PostgreSQL service.
2. Set env vars from `.env.example`.
   - Ensure `APP_URL` and `NEXTAUTH_URL` use your public HTTPS domain (for example `https://your-app.up.railway.app`).
3. Run Prisma migrate on deploy (`npx prisma migrate deploy`).
4. Start command: `npm run start`.

### Vercel
1. Connect repo to Vercel.
2. Provision managed Postgres (Neon/Supabase/Railway/etc).
3. Set env vars in Vercel project settings.
4. Configure Stripe/PayPal webhooks to production domain.

---

## Notes

- No scraping and no official claim of Google/Yelp/etc integrations.
- Imports are manual/CSV only in this version.
