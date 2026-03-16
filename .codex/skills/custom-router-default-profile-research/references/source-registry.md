# Source Registry

Use live verification on every run. Treat this file as the source registry, not as cached facts.

## Canonical Sources

| Source | URL | Trust For | Do Not Trust For |
| --- | --- | --- | --- |
| OpenRouter models API | `https://openrouter.ai/api/v1/models` | Current model IDs, availability, context length, pricing, modality | Relative benchmark quality or structured-output reliability claims |
| OpenRouter structured outputs | `https://openrouter.ai/docs/guides/features/structured-outputs` | `json_schema` and `json_object` behavior, request shape expectations | Model rankings |
| OpenRouter provider selection | `https://openrouter.ai/docs/guides/routing/provider-selection` | Provider-routing semantics, fallback behavior, provider preferences | Benchmark quality |
| Artificial Analysis leaderboards | `https://artificialanalysis.ai/leaderboards/models` | Cross-model quality, speed, and price comparisons | Provider-native availability or exact OpenRouter IDs |
| Arena leaderboard | `https://arena.ai/leaderboard` | Human preference and subjective quality signals | Structured-output reliability, pricing, or provider-native facts |
| SWE-bench | `https://www.swebench.com/` | Coding reliability evidence | General-purpose model quality outside coding |

## Source Precedence

1. Use provider-native sources for provider-native facts.
   - Availability, IDs, context, and price come from OpenRouter when the preset is OpenRouter-first.
2. Use benchmark sites for relative fit.
   - Benchmark sources justify why a model is strong for a task family.
3. Use the repo eval spec for routing-task mapping.
   - `/Users/pablomartinez/Downloads/auto router/docs/router_eval_spec.json` decides which benchmark families matter for the profile thesis.

## Conflict Handling

When sources disagree:

1. Record the disagreement with an absolute date.
2. Prefer OpenRouter for model ID, pricing, context, and modality.
3. Prefer benchmark sources only for their own evaluation domain.
4. If the disagreement changes the preset decision, stop and explain it before editing repo code.

## Live-Check Minimum

Before recommending a preset change, verify all of the following live:

- every selected model ID still resolves on OpenRouter
- pricing and context were fetched during the current run
- benchmark evidence for the claimed strengths was checked during the current run
- classifier candidates were checked against structured-output requirements during the current run

## Recommended Research Order

1. OpenRouter models API
2. OpenRouter structured outputs docs
3. OpenRouter provider selection docs
4. Artificial Analysis
5. Arena
6. SWE-bench

This order avoids ranking unavailable models or copying stale provider facts into the evidence packet.
