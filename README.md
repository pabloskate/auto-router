# CustomRouter v1

Build your ultimate composite model. An entirely customizable LLM routing proxy that directs each prompt to the perfect model based on your natural language rules. Features intelligent failover and thread stickiness, all behind a single OpenAI-compatible endpoint.

## Monorepo Layout

- `apps/web`: Next.js API + minimal admin UI.
- `apps/ingest-worker`: Cloudflare Cron worker for daily scorecard refresh.
- `packages/core`: routing engine, classifier, stickiness policy.
- `packages/data`: Artificial Analysis + OpenRouter adapters and artifact builder.
- `infra/d1/schema.sql`: D1 schema.

## Compatibility Contract

- OpenAI-compatible endpoints:
  - `POST /api/v1/chat/completions`
  - `POST /api/v1/responses`
- Router opt-in only when `model=auto` or `model=router/auto`.
- No required custom fields.

### BYOK (per account, no custom headers)

Each user connects their own OpenRouter (or compatible) key once in the admin UI.
After that, clients like Cursor can call your OpenAI-compatible endpoints normally:

- `POST /api/v1/chat/completions`
- `POST /api/v1/responses`

with `model: "auto"` and your router API key only.

If a user has not connected BYOK, routed requests fail with `400` instead of falling back to server credits.

## How to Use

CustomRouter exposes a standard OpenAI-compatible API, meaning it works out of the box with tools like **Cursor**, **Cline**, or any standard API client.

### Client Setup (e.g., Cursor)

To configure CustomRouter in your favorite AI app:
1. **Base URL / Endpoint:** Set your base URL to your deployed instance ending in `/api/v1` (e.g., `https://your-domain.com/api/v1`).
2. **API Key:** Use the CustomRouter API key you generated for your account.
3. **Model Selection:** 
   - To use the intelligent router, type exactly `auto` (or `router/auto`) as the model name.
   - **Direct Model Access:** You can also bypass the router by typing the exact OpenRouter ID (e.g., `anthropic/claude-3.5-sonnet`) or your direct Gateway ID. CustomRouter will pass the request directly to that specific model.

### Commands

CustomRouter supports special inline commands you can include directly in your chat messages:

- **`$$config`**: Type this in a message to start an interactive configuration chat. You can converse with an orchestrator LLM to adjust your routing instructions, change default models, set blocklists, or manage your custom catalog directly from your chat client without visiting the admin UI.
- **`#route`**: Include this anywhere in your prompt to force CustomRouter to immediately re-evaluate and select a new model for the current turn, breaking any existing "thread pin" (see below).

### How Routing Works (The Logic)

CustomRouter is designed to minimize context switching and latency. Here is a plain English overview of its logic:

1. **Initial Request:** When you start a brand new conversation with `model="auto"`, the system analyzes your prompt. Using a fast classifier and category scorecards (coding, math, creative, etc.), it selects the best-suited model.
2. **Thread Stickiness (The "Pin"):** Once a model is chosen, CustomRouter "pins" that model to the conversation. Subsequent messages in the exact same thread will continue using this same model automatically. This prevents unnecessary re-routing and maintains consistent context.
3. **When it Routes Again:** The router will only break the active pin and evaluate a new model if:
   - You explicitly inject the **`#route`** command in your prompt.
   - The conversation reaches a natural boundary (a "phase change" where an agent finishes its current overarching task).
   - An image payload is detected, and the currently pinned model lacks vision capabilities.
   - The thread pin expires (after 1 hour of inactivity).

*Note: CustomRouter explicitly avoids re-routing during active agent tool-call loops to ensure the agent's workflow remains unbroken.*

## Key Features

- Weighted model scoring by category (`coding`, `math`, `general`, `long_context`, `creative`).
- Daily ingestion from Artificial Analysis + OpenRouter catalog.
- Manual AA->OpenRouter mapping overrides in router config.
- Explainability endpoint: `GET /api/v1/router/explanations/:request_id`.
- 1-hour thread pinning to avoid rerouting every agent step.
- Privileged router/admin endpoints require `Authorization: Bearer <ADMIN_SECRET>`.
- UI auth uses HttpOnly session cookies (no client-side token storage).

## Local Development

```bash
npm install
npm run typecheck
npm run dev -w @auto-router/web
```

Copy `.env.example` to `.env.local` (or set secrets in Cloudflare bindings).

## Tests

```bash
npm run test -w @auto-router/core
```

## Cloudflare Deploy

See `docs/deployment-cloudflare.md`.
