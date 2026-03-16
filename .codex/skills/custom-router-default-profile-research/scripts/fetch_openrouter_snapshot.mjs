#!/usr/bin/env node

const DEFAULT_URL = "https://openrouter.ai/api/v1/models";

function usage() {
  console.error(`Usage:
  node fetch_openrouter_snapshot.mjs <model-id> [model-id...]
  node fetch_openrouter_snapshot.mjs --format json <model-id> [model-id...]
  node fetch_openrouter_snapshot.mjs --out /tmp/snapshot.md <model-id> [model-id...]
`);
}

function parseArgs(argv) {
  const result = {
    format: "markdown",
    out: null,
    modelIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      const next = argv[index + 1];
      if (!next || !["markdown", "json"].includes(next)) {
        throw new Error("--format requires 'markdown' or 'json'");
      }
      result.format = next;
      index += 1;
      continue;
    }
    if (arg === "--out") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--out requires a file path");
      }
      result.out = next;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    result.modelIds.push(arg);
  }

  if (!result.modelIds.length) {
    throw new Error("at least one model ID is required");
  }

  return result;
}

function numeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function priceToPerMillion(value) {
  const parsed = numeric(value);
  if (parsed <= 0) {
    return 0;
  }
  if (parsed < 0.1) {
    return parsed * 1_000_000;
  }
  return parsed;
}

function extractRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.models)) {
      return payload.models;
    }
  }
  return [];
}

function normalizeModel(row) {
  return {
    id: row.id,
    name: row.name || row.id,
    contextTokens: row.context_length || row.top_provider?.max_completion_tokens || 0,
    inputPricePerMillion: priceToPerMillion(row.pricing?.prompt),
    outputPricePerMillion: priceToPerMillion(row.pricing?.completion),
    modality: row.architecture?.modality || "",
  };
}

function formatMoney(value) {
  if (!value) {
    return "n/a";
  }
  const fixed = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(2) : value.toFixed(4);
  return `$${fixed}/M`;
}

function formatContext(value) {
  if (!value) {
    return "n/a";
  }
  return value.toLocaleString("en-US");
}

function toMarkdown(rows, missing, fetchedAt) {
  const lines = [
    `# OpenRouter Snapshot`,
    ``,
    `- Fetched at: ${fetchedAt}`,
    `- Source: ${DEFAULT_URL}`,
    ``,
    `| Model ID | Name | Context | Input Price | Output Price | Modality |`,
    `| --- | --- | ---: | ---: | ---: | --- |`,
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.name} | ${formatContext(row.contextTokens)} | ${formatMoney(row.inputPricePerMillion)} | ${formatMoney(row.outputPricePerMillion)} | ${row.modality || "n/a"} |`,
    );
  }

  if (missing.length) {
    lines.push("");
    lines.push("## Missing IDs");
    lines.push("");
    for (const id of missing) {
      lines.push(`- ${id}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    usage();
    process.exit(1);
  }

  const response = await fetch(DEFAULT_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const rows = extractRows(payload).map(normalizeModel);
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const selected = args.modelIds.map((id) => rowMap.get(id)).filter(Boolean);
  const missing = args.modelIds.filter((id) => !rowMap.has(id));
  const fetchedAt = new Date().toISOString();

  const output = args.format === "json"
    ? JSON.stringify(
        {
          fetchedAt,
          sourceUrl: DEFAULT_URL,
          models: selected,
          missing,
        },
        null,
        2,
      )
    : toMarkdown(selected, missing, fetchedAt);

  if (args.out) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(args.out, output, "utf8");
  } else {
    process.stdout.write(output);
  }

  if (missing.length) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
