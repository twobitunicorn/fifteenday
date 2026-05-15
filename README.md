# fifteenday

AI on-ramp to Oregon's public records law (ORS 192). Interview a citizen, draft a properly-scoped request, route to the right custodian, send it, and publish responses to a shared library — after human review.

See [PITCH.md](./PITCH.md) for the why and the team ask.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · shadcn/ui · Drizzle ORM · Neon Postgres · Vercel AI SDK (Anthropic) · Resend (outbound + inbound) · Vercel Blob.

## Dev setup

```bash
pnpm install
cp .env.example .env.local
# fill in DATABASE_URL, ANTHROPIC_API_KEY, RESEND_API_KEY at minimum
pnpm db:push        # apply schema to the dev database
pnpm db:seed        # load the hand-curated custodian directory
pnpm dev            # http://localhost:3000
```

## Required provisioning

These need human action before the dev server is useful:

1. **Neon Postgres** — provision via Vercel Marketplace. Sets `DATABASE_URL`.
2. **Anthropic API key** — `console.anthropic.com` → API keys. Sets `ANTHROPIC_API_KEY`.
3. **Resend** — create a domain (e.g. `fifteenday.org`), configure SPF/DKIM/DMARC, register an inbound route for `req-*@inbound.fifteenday.org` pointing at `/api/inbound/resend`. Sets `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `INBOUND_DOMAIN`, `OUTBOUND_FROM_EMAIL`.
4. **Vercel Blob** — create a store in the Vercel dashboard. Sets `BLOB_READ_WRITE_TOKEN`.
5. **Admin password** — generate a long random string. Sets `ADMIN_PASSWORD`.

See `.env.example` for the full list.

## Phases

The full plan lives at `~/.claude/plans/great-lets-implement-it-validated-dongarra.md`.

- **A — Scaffold** ✅ Next.js + Tailwind + shadcn + Drizzle schema + custodian seed
- **B — Interview + Draft + Send** the wizard, the routing, the Resend send
- **C — Inbound + Library** webhook receiver, public library, admin publish toggle
- **D — Stretch** PDF text extraction, moderator queue, magic-link auth

## Operating warnings

1. **Email deliverability** is the entire product's spine. New domains have terrible deliverability — warm the domain before sending to agencies.
2. **Manual redaction only.** Inbound responses default to `published=false`. A human must review before publish. Automated redaction is explicitly out of scope.
3. **Fee waivers** under ORS 192.324(5) require an explicit, user-affirmed public-interest rationale. The LLM does not decide.
4. **Verify every seeded custodian email** before sending real requests. The seed in `lib/custodians/seed.ts` is plausible but unverified.
