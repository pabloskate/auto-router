# Preset Change Template

Fill this out before editing repo code. Use absolute dates.

```markdown
# Preset Change Packet

## Run Metadata

- Date verified:
- Requested change:
- Scope:
- In scope files:
- Out of scope files:

## Profile Thesis

- Profile ID:
- Display name:
- Product promise:
- Primary tradeoff:
- Required capabilities:
- Unacceptable compromises:

## Benchmark Mapping

- Router eval families:
- Why these families matter:

## Selected Models

| Role | Model ID | Why selected | Source URLs |
| --- | --- | --- | --- |
| Routed pool |  |  |  |
| Default model |  |  |  |
| Primary classifier |  |  |  |
| Classifier fallback |  |  |  |

## OpenRouter Snapshot

- Snapshot command:
- Snapshot date:
- Pricing/context notes:
- Availability notes:

## Benchmark Notes

- Artificial Analysis:
- Arena:
- SWE-bench:
- Other live evidence:

## Rejected Alternatives

| Model ID | Role considered | Why rejected |
| --- | --- | --- |
|  |  |  |

## Planned Repo Changes

- `apps/web/src/lib/routing-presets.ts`:
- Focused tests:
- Docs updates, if any:

## Validation Plan

- Focused tests:
- Full web tests:
- Core tests:
- Typecheck:
- Dry eval:
- Live eval, if credentials exist:

## Failure Checks

- [ ] classifier available on target gateway
- [ ] default model has required capabilities
- [ ] benchmark claims verified on the current date
- [ ] preset model IDs resolve on OpenRouter
- [ ] conflicts between sources documented
```
