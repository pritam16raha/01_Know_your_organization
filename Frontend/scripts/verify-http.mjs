import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const credentials = JSON.parse(
  readFileSync(resolve(root, ".demo-credentials.json"), "utf8"),
);
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";

async function json(response) {
  const payload = await response.json();
  return { response, payload };
}

async function login(credential) {
  const { response, payload } = await json(
    await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credential),
      redirect: "manual",
    }),
  );
  assert.equal(response.status, 200, JSON.stringify(payload));
  const cookies = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  assert.ok(cookies, "Login should set an authenticated session cookie.");
  return cookies;
}

async function api(path, cookie, init = {}) {
  return json(
    await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...init.headers,
      },
      redirect: "manual",
    }),
  );
}

const unauthenticated = await api("/api/workspace");
assert.equal(unauthenticated.response.status, 401);

const loginPage = await fetch(`${baseUrl}/login`);
const loginMarkup = await loginPage.text();
assert.equal(loginPage.status, 200);
assert.ok(loginMarkup.includes("Organization A"));
assert.ok(loginMarkup.includes("Organization B"));
assert.ok(loginMarkup.includes("Northstar Labs"));
assert.ok(loginMarkup.includes("Rival Systems"));

const cookieA = await login(credentials.organizationA);
const cookieB = await login(credentials.organizationB);
const workspaceA = await api("/api/workspace", cookieA);
const workspaceB = await api("/api/workspace", cookieB);
assert.equal(workspaceA.response.status, 200);
assert.equal(workspaceB.response.status, 200);
assert.equal(workspaceA.payload.accounts.length, 2);
assert.equal(workspaceB.payload.accounts.length, 1);

const accountA = workspaceA.payload.accounts[0].id;
const accountB = workspaceB.payload.accounts[0].id;
const read = await api(`/api/accounts/${accountA}/activities`, cookieA);
assert.equal(read.response.status, 200);
assert.ok(read.payload.activities.length >= 3);

const requestBody = JSON.stringify({
  body: "HTTP route idempotency verification note.",
  idempotencyKey: randomUUID(),
});
const create = await api(`/api/accounts/${accountA}/activities`, cookieA, {
  method: "POST",
  body: requestBody,
});
const retry = await api(`/api/accounts/${accountA}/activities`, cookieA, {
  method: "POST",
  body: requestBody,
});
assert.equal(create.response.status, 201);
assert.equal(retry.response.status, 200);
assert.equal(create.payload.activity.id, retry.payload.activity.id);
assert.equal(retry.payload.wasDuplicate, true);

const forbiddenRead = await api(`/api/accounts/${accountB}/activities`, cookieA);
const forbiddenWrite = await api(`/api/accounts/${accountB}/activities`, cookieA, {
  method: "POST",
  body: JSON.stringify({
    body: "A tampered account ID must not cross tenants.",
    idempotencyKey: randomUUID(),
  }),
});
assert.equal(forbiddenRead.response.status, 403);
assert.equal(forbiddenWrite.response.status, 403);

console.log(
  JSON.stringify(
    {
      demoIdentityTabsRendered: true,
      unauthenticatedStatus: unauthenticated.response.status,
      successfulReadStatus: read.response.status,
      successfulCreateStatus: create.response.status,
      idempotentRetryStatus: retry.response.status,
      idempotentSameEntry: create.payload.activity.id === retry.payload.activity.id,
      crossTenantReadStatus: forbiddenRead.response.status,
      crossTenantWriteStatus: forbiddenWrite.response.status,
    },
    null,
    2,
  ),
);
