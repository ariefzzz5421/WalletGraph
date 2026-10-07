# WalletGraph

WalletGraph is a private on-chain watchlist and alert platform. This repository implements the Phase 1 foundation: accounts, multi-chain wallet records, custom tags and notes, verified transfer ingestion, an activity feed, Discord pairing, and rule-based Discord alerts. The web app, ingestion worker, and Discord bot run as separate processes.

## What works now

- Invite-code registration, password login, server-side sessions, account-scoped data, audit records, and basic login rate limiting.
- Add, edit, search, and remove wallets on Ethereum, Base, Solana, Avalanche, Arbitrum, Optimism, Polygon, and BNB Chain. EVM addresses are normalized; Solana addresses preserve case.
- Queue latest, 7/30/90-day, or full-history syncs. The worker records scan progress and provider health. Repeat scans deduplicate events.
- Alchemy Transfers adapter for EVM native, token, and NFT transfers where supported. Solana standard RPC adapter for parsed native SOL transfers. Each record retains the raw provider response.
- Activity feed and wallet profile with clear unknown/unverified fields. Transfer events are never relabeled as swaps or bridges without transaction decoding evidence.
- Alert rules for wallet, chain, event type, direction, token symbol, and minimum verified USD value. Matching is deterministic. The worker creates one Discord delivery per connected server and retries failures.
- Discord bot pairing via `/connect`, plus `/wallet track`, `/wallet remove`, `/wallet info`, `/wallet activity`, `/wallet tags`, and `/alerts list`. Manage Server permission is required for all commands.

## Run locally

Requirements: Node.js 24+, PostgreSQL 17+, and a Discord application only if bot alerts are needed.

1. Copy `.env.example` to `.env`. Set a private `REGISTRATION_CODE` with at least 20 characters and a PostgreSQL `DATABASE_URL`. Keep `.env` out of Git.
2. Start PostgreSQL. `docker compose up -d` is provided as one option; a local or managed PostgreSQL instance also works. Change the example database password before any shared or remote deployment.
3. Run `npm install`, then `npm run db:migrate`.
4. Start the web app with `npm run dev` and the ingestion process in another terminal with `npm run worker`.
5. Open `http://localhost:3000`, create the first account with the registration code, then add a wallet. The first registered account receives the `admin` role; further invited accounts receive `member`.
6. For EVM activity, set `ALCHEMY_API_KEY`. For Solana native transfers, set `SOLANA_RPC_URL` to a trusted RPC endpoint. Restart the worker after changing these values.
7. For Discord, set `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID`, start `npm run bot`, generate a pairing code in the Discord page, invite the bot, then run `/connect` in the desired alert channel.

The environment file is read by the worker, bot, and migration scripts with Node's `--env-file` support. Next.js reads it for the web app. Set the same server-side secrets on the respective deployment services. Do not prefix secrets with `NEXT_PUBLIC_`.

## Deployment

- Deploy the Next.js app to Vercel with `DATABASE_URL`, `APP_URL`, `REGISTRATION_CODE`, and optional provider/Discord configuration.
- Deploy `npm run worker` and `npm run bot` as separate long-running services on Railway, Fly.io, Render, or a VPS. Do not run either as a Vercel request function.
- Run `npm run db:migrate` during controlled deployment before starting the new release. Use a managed PostgreSQL instance with backups and TLS. The included Compose file is for local development only.
- All API keys and Discord bot credentials stay server-side. The Data Sources page displays status only, never secret values.

## Evidence boundary

This MVP has **no configured live provider by default**. It shows `unavailable` until credentials are supplied and a worker request succeeds. The EVM adapter uses Alchemy's Transfers API; coverage varies by chain and category. The Solana adapter currently parses native system transfers only. Portfolio balances, USD estimates, swaps, bridges, ENS/SNS, NFT holdings, wallet ownership, and relationship confidence are not computed. USD alert thresholds remain inactive for unpriced events. No sample blockchain data is inserted.

Discord delivery is durable and deduplicated at the database level by rule, event, and server. Like most external message queues, a process crash after Discord accepts a message but before the database records success can cause a retry. A later version can use Discord's supported idempotency controls if validated for bot messages.

## Architecture

```
Next.js dashboard and authenticated API ──→ PostgreSQL
                                             ↑       ↓
Alchemy / Solana RPC ──→ worker ──→ normalized wallet events
                                    └─→ alert matches ──→ Discord deliveries
Discord bot ──→ pairing and slash commands ────────────────┘
```

`src/lib/providers/types.ts` defines the provider interface. New adapters can be registered in `src/lib/providers/index.ts`. Event keys are derived from chain plus provider transaction event identity; the database also enforces `(wallet_id,event_key)` uniqueness. Jobs are claimed with PostgreSQL `SKIP LOCKED` and stale jobs are reclaimed. Each user-scoped query filters by `user_id`.

## Next phases

Phase 2: entities, evidence-backed relationships, a bounded network graph, token intelligence, verified price enrichment, richer alert expressions, provider fallback, and user-facing provider configuration. Phase 3: clusters, discovery, anomalies, deep historical analytics, and AI explanations tied to transaction evidence. The sidebar marks these as planned instead of showing fabricated intelligence.

## Checks

`npm test` runs core normalization, password, rule, and provider adapter tests. `npm run typecheck` and `npm run build` validate the app. An end-to-end ingestion and Discord delivery test needs a PostgreSQL database and real provider/bot credentials.
