#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env.local");
const examplePath = resolve(".env.example");

function generateSecret() {
  return randomBytes(32).toString("base64url");
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

let content = "";
if (existsSync(envPath)) {
  content = readFileSync(envPath, "utf8");
} else if (existsSync(examplePath)) {
  content = readFileSync(examplePath, "utf8");
}

const secret = generateSecret();
if (/^BYOK_ENCRYPTION_SECRET=.*$/m.test(content)) {
  content = content.replace(/^BYOK_ENCRYPTION_SECRET=.*$/m, (line) => {
    const value = line.slice("BYOK_ENCRYPTION_SECRET=".length).trim();
    return value ? line : `BYOK_ENCRYPTION_SECRET=${secret}`;
  });
} else {
  content = `${ensureTrailingNewline(content)}BYOK_ENCRYPTION_SECRET=${secret}\n`;
}

writeFileSync(envPath, ensureTrailingNewline(content), { mode: 0o600 });
console.log(`Local environment ready: ${envPath}`);
