#!/usr/bin/env node
/**
 * Verifies admin flow: create account, login, check key sections load.
 * Run while dev server is up: npm run dev
 */
import { chromium } from "playwright";
import { writeFile } from "fs/promises";

const BASE = "http://localhost:3000";
const testUser = {
  name: "Test User",
  email: "verify-admin@test.local",
  password: "TestPass123!",
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Signup + login via request context (cookies stored in context)
    console.log("Creating account...");
    const signupRes = await context.request.post(`${BASE}/api/v1/auth/signup`, {
      data: testUser,
      headers: { "Content-Type": "application/json" },
      failOnStatusCode: false,
    });
    if (signupRes.status() === 201) console.log("✓ Account created");
    else if (signupRes.status() !== 400) throw new Error(`Signup ${signupRes.status()}: ${await signupRes.text()}`);

    const loginRes = await context.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email: testUser.email, password: testUser.password },
      headers: { "Content-Type": "application/json" },
      failOnStatusCode: false,
    });
    if (loginRes.status() !== 200) throw new Error(`Login ${loginRes.status()}: ${await loginRes.text()}`);
    console.log("✓ Logged in");

    // 2. Open admin (context shares cookies with page)
    console.log("Opening /admin...");
    await page.goto(`${BASE}/admin`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    // 3. Verify we're logged in (admin tabs: Gateways, Routing, API Keys)
    const configureTab = page.locator("a, button", { hasText: /Gateways|Routing/i }).first();
    await configureTab.waitFor({ state: "visible", timeout: 5000 });

    // 8. Click Routing tab
    const routingTab = page.locator("a, button", { hasText: "Routing" }).first();
    if (await routingTab.isVisible()) {
      await routingTab.click();
      await page.waitForTimeout(800);
    }

    // 9. Check Global Blocklist or Fallback visible on routing page
    const routingContent = page.locator("text=Global Blocklist").or(page.locator("text=Default Fallback Model"));
    await routingContent.first().waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Routing page loads");

    // 10. Click API Keys tab
    const keysTab = page.locator("a, button", { hasText: /API Key|Keys/ }).first();
    if (await keysTab.isVisible()) {
      await keysTab.click();
      await page.waitForTimeout(500);
      console.log("✓ API Keys tab loads");
    }

    console.log("\n✓ Admin flow verified successfully");
  } catch (err) {
    console.error("Failed:", err.message);
    const outDir = "scripts";
    await page.screenshot({ path: `${outDir}/verify-admin-failure.png` });
    const html = await page.content();
    await writeFile(`${outDir}/verify-admin-failure.html`, html);
    console.error(`Screenshot: ${outDir}/verify-admin-failure.png`);
    console.error(`HTML dump: ${outDir}/verify-admin-failure.html`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
