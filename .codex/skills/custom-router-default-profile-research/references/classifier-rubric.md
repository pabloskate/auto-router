# Classifier Rubric

Use this rubric to choose the `classifierModel` for a preset.

The router code in `/Users/pablomartinez/Downloads/auto router/apps/web/src/lib/routing/frontier-classifier.ts` tries `json_schema` first and falls back to `json_object`. The classifier therefore must be a good fit for structured output, not just general chat quality.

## Hard Gates

Reject a classifier candidate immediately if any gate fails:

1. It is not currently available on the target gateway.
2. It cannot accept the prompt size implied by the current catalog and routing instructions.
3. It is too expensive or too slow for per-request routing overhead.
4. It is missing the modality needed for the routing problem.
   - For the current preset seam this usually means text input is enough.

## Ranking Order

Rank remaining candidates in this exact order:

1. Gateway availability
   - Stable current model ID on the gateway beats any stronger benchmark result from an unavailable model.
2. Structured-output reliability
   - Prefer candidates with credible support for `json_schema`.
   - If `json_schema` support is uncertain, require confidence that `json_object` output is still reliable enough for routing.
3. Context headroom
   - The candidate must comfortably fit the prompt built from the user request, model catalog, and routing instructions.
4. Latency and cost
   - A classifier runs on the hot path. Lower latency and lower per-token cost matter.
5. Instruction-following quality
   - Use benchmark and preference evidence to break ties after the operational concerns above are satisfied.

## Recommended Scoring Sheet

Score each surviving candidate:

| Candidate | Available | Structured Output | Context Headroom | Latency | Cost | Instruction Following | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `model/id` | pass/fail | 0-3 | 0-3 | 0-3 | 0-3 | 0-3 | keep/drop |

Interpretation:

- `3`: strong fit for the criterion
- `2`: acceptable fit
- `1`: weak but possibly usable
- `0`: effectively disqualified

## Required Output

Every evidence packet must name:

- `Primary classifier candidate`
- `Classifier fallback candidate`
- `Why the primary won`
- `Why the fallback lost`

## Practical Defaults

For OpenRouter-first presets, classifier candidates usually come from fast, cheap, instruction-following text models with enough context for the full routing prompt. Avoid paying premium-model prices for routing unless the routing problem itself is unusually hard.

If a premium model only wins on raw intelligence but loses badly on latency or cost, prefer the cheaper classifier and keep the premium model in the routed pool instead.
