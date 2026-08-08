import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = process.env.TEST_BASE_URL ?? "http://192.168.0.111:3000";
const browserCandidates = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const executablePath = browserCandidates.find((path) => existsSync(path));
if (!executablePath) throw new Error("Set BROWSER_PATH to an installed Chromium browser.");

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  const capabilities = await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasRandomUuid: typeof window.crypto?.randomUUID === "function",
    hasRandomValues: typeof window.crypto?.getRandomValues === "function",
  }));
  assert.equal(capabilities.isSecureContext, false);
  assert.equal(capabilities.hasRandomUuid, false);
  assert.equal(capabilities.hasRandomValues, true);

  await page.getByRole("button", { name: /Organization A/ }).click();
  assert.ok(await page.getByLabel("Email").inputValue());
  assert.ok(await page.getByLabel("Password").inputValue());
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });

  await page.getByLabel("Account").selectOption({ label: "Globex Retail" });
  await page.locator(".spinner").waitFor({ state: "detached", timeout: 15_000 });
  const note = `LAN browser feedback verification ${Date.now()}`;
  await page.getByLabel("Add a note").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();

  const success = page.locator(".feedback.success");
  await success.waitFor({ state: "visible", timeout: 15_000 });
  assert.match((await success.textContent()) ?? "", /Note added successfully/);
  assert.equal(await page.getByLabel("Add a note").inputValue(), "");
  assert.equal(await page.locator(".feed-item", { hasText: note }).count(), 1);
  assert.deepEqual(pageErrors, []);

  console.log(
    JSON.stringify({
      origin: baseUrl,
      ...capabilities,
      signIn: "passed",
      globexCreate: "passed",
      visibleSuccessFeedback: "passed",
      textareaCleared: "passed",
      noteRenderedOnce: "passed",
    }),
  );
} finally {
  await browser.close();
}

