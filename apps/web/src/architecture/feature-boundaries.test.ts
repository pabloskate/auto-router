import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function collectRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectRouteFiles(entryPath);
    }
    return entry.name === "route.ts" ? [entryPath] : [];
  });
}

describe("feature boundaries", () => {
  it("keeps agent-facing architecture docs in the expected locations", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const requiredDocs = [
      "AGENTS.md",
      "docs/ARCHITECTURE.md",
      "apps/web/AGENTS.md",
      "apps/web/src/features/routing/AGENTS.md",
      "packages/core/AGENTS.md",
      "packages/data/AGENTS.md",
      ".github/copilot-instructions.md",
    ];

    for (const file of requiredDocs) {
      expect(fs.existsSync(path.join(repoRoot, file)), file).toBe(true);
    }
  });

  it("keeps generated verification artifacts out of the tracked script root", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const scriptsRoot = path.join(repoRoot, "scripts");
    const generatedArtifactPattern = /^verify-.*\.(png|html)$/;

    const generatedArtifacts = fs
      .readdirSync(scriptsRoot)
      .filter((entry) => generatedArtifactPattern.test(entry));

    expect(generatedArtifacts).toEqual([]);
  });

  it("keeps external font hosts aligned with the global layout", () => {
    const nextConfig = fs.readFileSync(path.resolve(process.cwd(), "next.config.mjs"), "utf8");
    const layout = fs.readFileSync(path.resolve(process.cwd(), "app/layout.tsx"), "utf8");

    expect(layout).toContain("fonts.googleapis.com");
    expect(layout).toContain("fonts.gstatic.com");
    expect(nextConfig).toContain("https://fonts.googleapis.com");
    expect(nextConfig).toContain("https://fonts.gstatic.com");
  });

  it("keeps route adapters within the documented complexity budget", () => {
    const routeRoot = path.resolve(process.cwd(), "app/api/v1");
    const routeFiles = collectRouteFiles(routeRoot);

    for (const file of routeFiles) {
      const lineCount = fs.readFileSync(file, "utf8").split("\n").length;
      expect(lineCount, path.relative(process.cwd(), file)).toBeLessThanOrEqual(220);
    }
  });

  it("keeps low-level auth imports out of non-auth route handlers", () => {
    const routeRoot = path.resolve(process.cwd(), "app/api/v1");
    const exempt = new Set([
      path.resolve(routeRoot, "admin/verify/route.ts"),
      path.resolve(routeRoot, "billing/enterprise-inquiry/route.ts"),
    ]);

    const lowLevelAuthPattern = /\b(authenticateRequest|authenticateSession|isSameOriginRequest|verifyAdminSecret)\b/;
    const routeFiles = collectRouteFiles(routeRoot)
      .map((file) => path.resolve(file))
      .filter((file) => !file.includes(`${path.sep}auth${path.sep}`))
      .filter((file) => !exempt.has(file));

    for (const file of routeFiles) {
      const contents = fs.readFileSync(file, "utf8");
      expect(contents, path.relative(process.cwd(), file)).not.toMatch(lowLevelAuthPattern);
    }
  });

  it("keeps routed endpoints on the shared factory", () => {
    const routedEndpoints = [
      path.resolve(process.cwd(), "app/api/v1/chat/completions/route.ts"),
      path.resolve(process.cwd(), "app/api/v1/responses/route.ts"),
      path.resolve(process.cwd(), "app/api/v1/completions/route.ts"),
      path.resolve(process.cwd(), "app/api/v1/router/inspect/route.ts"),
    ];

    for (const file of routedEndpoints) {
      const contents = fs.readFileSync(file, "utf8");
      expect(contents, path.relative(process.cwd(), file)).toMatch(
        /create(?:Billed)?RoutedEndpoint/
      );
      expect(contents, path.relative(process.cwd(), file)).not.toMatch(/\b(routeAndProxy|authenticateRequest|authenticateSession|loadGatewaysWithMigration)\b/);
    }
  });

  it("keeps shared UI contracts out of admin component definitions", () => {
    const profilesPanel = fs.readFileSync(path.resolve(process.cwd(), "src/features/routing/components/RoutingProfilesEditor.tsx"), "utf8");
    const gatewayPanel = fs.readFileSync(path.resolve(process.cwd(), "src/features/gateways/components/GatewayPanel.tsx"), "utf8");

    expect(profilesPanel).not.toContain("export type RouterProfile =");
    expect(gatewayPanel).not.toContain("export interface GatewayInfo");
    expect(gatewayPanel).not.toContain("export interface GatewayModel");
  });

  it("keeps feature-owned admin shell wiring out of legacy admin adapters", () => {
    const adminShell = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin-shell/admin-shell.tsx"), "utf8");
    const useAdminData = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin-shell/use-admin-data.ts"), "utf8");

    expect(adminShell).not.toMatch(/@\/src\/components\/admin\/admin-(extensions|tab-registry|tabs)/);
    expect(adminShell).not.toContain('@/src/components/admin/types');
    expect(useAdminData).not.toContain('@/src/components/admin/types');
  });

  it("keeps the user settings route as a thin adapter", () => {
    const route = fs.readFileSync(path.resolve(process.cwd(), "app/api/v1/user/me/route.ts"), "utf8");

    expect(route).toContain("handleGetCurrentUser");
    expect(route).toContain("handleUpdateCurrentUser");
    expect(route).not.toMatch(/\b(loadGatewaysWithMigration|getUserUpstreamCredentials|normalizeProfile|request\.json)\b/);
  });
});
