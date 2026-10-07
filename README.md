# WalletGraph

WalletGraph is a private on-chain watchlist and alert platform. This repository implements the Phase 1 foundation: accounts, multi-chain wallet records, custom tags and notes, verified transfer ingestion, an activity feed, Discord pairing, and rule-based Discord alerts. The web app, ingestion worker, and Discord bot run as separate processes.

## What works now

- One-time setup with a username and password, password login, server-side sessions, account-scoped data, audit records, and basic login rate limiting. Public sign-up closes after the first account is created.
- Add, edit, search, and remove wallets on Ethereum, Base, Solana, Avalanche, Arbitrum, Optimism, Polygon, and BNB Chain. EVM addresses are normalized; Solana addresses preserve case.
- Queue latest, 7/30/90-day, or full-history syncs. The worker records scan progress and provider health. Repeat scans deduplicate events.
- Alchemy Transfers adapter for EVM native, token, and NFT transfers where supported. Solana standard RPC adapter for parsed native SOL transfers. Each record retains the raw provider response.
- Activity feed and wallet profile with clear unknown/unverified fields. Transfer events are never relabeled as swaps or bridges without transaction decoding evidence.
- Alert rules for wallet, chain, event type, direction, token symbol, and minimum verified USD value. Matching is deterministic. The worker creates one Discord delivery per connected server and retries failures.
- Discord bot pairing via `/connect`, plus `/wallet track`, `/wallet remove`, `/wallet info`, `/wallet activity`, `/wallet graph`, `/wallet portfolio`, `/wallet tags`, and `/alerts list|create|delete`. Manage Server permission is required for all commands.
- An evidence-backed network graph with one to three hops, time/type/count filters, bounded queries, clickable expansion, and transaction links. Its edges are observed transfers, not identity conclusions.
- Manual entities can group wallets across chains and show distinct indexed events. Database constraints prevent cross-account membership and place each wallet in at most one entity.
- Workspace search covers wallet addresses/names, entity names, custom tags, and token contracts observed in your indexed events. Search links lead to the relevant wallet, entity, filtered watchlist, or activity feed.

## Run locally

Requirements: Node.js 24+, PostgreSQL 17+, and a Discord application only if bot alerts are needed.

1. Copy `.env.example` to `.env`. Set a PostgreSQL `DATABASE_URL`. Keep `.env` out of Git.
2. Start PostgreSQL. `docker compose up -d` is provided as one option; a local or managed PostgreSQL instance also works. Change the example database password before any shared or remote deployment.
3. Run `npm install`, then `npm run db:migrate`. Numbered SQL migrations are tracked in `schema_migrations` and applied once in order.
4. Start the web app with `npm run dev` and the ingestion process in another terminal with `npm run worker`.
5. Open `http://localhost:3000`, create the first account with a username and password, then add a wallet. The first account receives the `admin` role and closes public sign-up. Existing email-based accounts can still sign in using their email as the username.
6. For EVM activity, set `ALCHEMY_API_KEY`. For Solana native transfers, set `SOLANA_RPC_URL` to a trusted RPC endpoint. Restart the worker after changing these values.
7. For Discord, set `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID`, start `npm run bot`, generate a pairing code in the Discord page, invite the bot, then run `/connect` in the desired alert channel.

The environment file is read by the worker, bot, and migration scripts with Node's `--env-file` support. Next.js reads it for the web app. Set the same server-side secrets on the respective deployment services. Do not prefix secrets with `NEXT_PUBLIC_`.

## Deployment

- Deploy the Next.js app to Vercel with `DATABASE_URL`. `APP_URL` is optional for the web app; set it to the final public URL on the separately hosted bot so `/wallet graph` links work.
- Deploy `npm run worker` and `npm run bot` as separate long-running services on Railway, Fly.io, Render, or a VPS. Do not run either as a Vercel request function.
- Run `npm run db:migrate` during controlled deployment before starting the new release. The migration runner prefers `DATABASE_URL_UNPOOLED` when available, because it holds a session lock while applying SQL files. Use a managed PostgreSQL instance with backups and TLS. The included Compose file is for local development only.
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

The first Phase 2 slice now includes manual entities and a bounded observed-transfer graph. Remaining Phase 2 work: token intelligence, verified price enrichment, richer alert expressions, provider fallback, and user-facing provider configuration. Phase 3: clusters, discovery, anomalies, deep historical analytics, and AI explanations tied to transaction evidence. The sidebar marks future features as planned instead of showing fabricated intelligence.

## Checks

`npm test` runs core normalization, password, rule, and provider adapter tests. `npm run typecheck` and `npm run build` validate the app. An end-to-end ingestion and Discord delivery test needs a PostgreSQL database and real provider/bot credentials.
