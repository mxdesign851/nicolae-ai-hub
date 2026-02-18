# AI Review Reply Manager

Production-ready multi-tenant SaaS for generating high-quality AI replies to customer reviews.

## Stack
- Next.js 14 (App Router), React 18, TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- NextAuth (Credentials + optional GitHub OAuth)
- AI providers: OpenAI, Anthropic Claude, Gemini (pluggable)
- Billing: Stripe + PayPal subscription flows

## Core capabilities
- Multi-tenant Workspaces with roles: OWNER / ADMIN / MEMBER
- Free / Pro / Agency plans with server-side limit enforcement
- Locations inside workspaces
- Reviews with status, tags, sentiment
- Manual review import and CSV import endpoint
- AI reply draft generation using provider + length + language + escalation rules
- Brand Voice at workspace or location level

## Data model highlights
- `Workspace` has `plan`, `aiGenerationsUsed`, and `monthBucket` for monthly metering
- `BrandVoice` can be attached to workspace or location
- `Subscription` stores provider (`stripe`/`paypal`) and external subscription id

## Setup
```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## API endpoints
- `POST /api/workspaces`
- `POST /api/reviews/import` (JSON manual or multipart CSV)
- `POST /api/reviews/generate`
- `POST /api/subscriptions/stripe`
- `POST /api/subscriptions/paypal`

## Plan limits
- **Free**: 1 workspace, 1 location, 50 generations/month
- **Pro**: 3 locations, 1000 generations/month, brand voice + approval workflow
- **Agency**: unlimited locations, 10000 generations/month, bulk + exports + priority

## Deployment
- Dockerfile included
- Compatible with Railway/Vercel (set env vars + managed Postgres)
