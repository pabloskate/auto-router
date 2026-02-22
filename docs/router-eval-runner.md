# Router Eval Runner

This runner evaluates router or direct-model quality using `docs/router_eval_spec.json`.

## Modes

- `router`: sends queries to your OpenAI-compatible router endpoint (`model=auto`).
- `model`: sends queries directly to an OpenRouter model baseline.

## Quick Start

Dry-run (no network):

```bash
npm run eval:router:dry -- --limit 10
npm run eval:model:dry -- --model openai/gpt-5.2 --limit 10
```

Live router run:

```bash
ROUTER_BASE_URL=http://localhost:3001 OPENROUTER_API_KEY=... npm run eval:router -- --limit 20
```

Live model baseline:

```bash
OPENROUTER_API_KEY=... npm run eval:model -- --model openai/gpt-5.2 --limit 20
```

## Output

Reports are written to `docs/eval-results/`:

- `<run-id>.json`: full per-query output, judge notes, and component scores.
- `<run-id>.md`: summary report for fast review.

## Scoring

Per query score components:

- `task_success` (judge model)
- `factuality` (judge model)
- `safety` (judge model)
- `constraint_fit` (deterministic checks)
- `latency_cost_efficiency` (deterministic from latency + usage/cost)

Overall score uses weights from `docs/router_eval_spec.json`.

## Important Notes

- Judge model defaults to `openai/gpt-5.2`, override with `--judge-model`.
- Router mode expects endpoint: `POST /api/v1/chat/completions`.
- If usage cost is absent from provider response, cost efficiency uses latency with neutral cost fallback.
