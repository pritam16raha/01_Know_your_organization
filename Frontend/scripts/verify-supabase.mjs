import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(import.meta.dirname, "..");

function readEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const env = readEnv(resolve(root, ".env"));
const credentials = JSON.parse(
  readFileSync(resolve(root, ".demo-credentials.json"), "utf8"),
);

async function authenticatedClient({ email, password }) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.user, `Expected ${email} to authenticate.`);
  return client;
}

const organizationA = await authenticatedClient(credentials.organizationA);
const organizationB = await authenticatedClient(credentials.organizationB);

const { data: workspaceA, error: workspaceAError } = await organizationA.rpc(
  "get_my_workspace",
);
const { data: workspaceB, error: workspaceBError } = await organizationB.rpc(
  "get_my_workspace",
);
assert.ifError(workspaceAError);
assert.ifError(workspaceBError);
assert.equal(workspaceA.length, 2, "Organization A should see its two accounts.");
assert.equal(workspaceB.length, 1, "Organization B should see its one account.");
assert.notEqual(workspaceA[0].organization_id, workspaceB[0].organization_id);
assert.ok(
  workspaceA.every((row) => row.organization_id === workspaceA[0].organization_id),
  "Organization A workspace leaked a different tenant.",
);

const ownAccountId = workspaceA.find((row) => row.account_name === "Acme Corporation").account_id;
const foreignAccountId = workspaceB[0].account_id;

const { data: activity, error: activityError } = await organizationA.rpc(
  "get_account_activity",
  { p_account_id: ownAccountId },
);
assert.ifError(activityError);
assert.ok(activity.length >= 3, "The successful read path should return seeded notes.");

const idempotencyKey = "90000000-0000-4000-8000-000000000001";
const createRequest = {
  p_account_id: ownAccountId,
  p_body: "Automated idempotency verification note.",
  p_idempotency_key: idempotencyKey,
};
const firstCreate = await organizationA.rpc("create_account_note", createRequest);
const retryCreate = await organizationA.rpc("create_account_note", createRequest);
assert.ifError(firstCreate.error);
assert.ifError(retryCreate.error);
assert.equal(firstCreate.data.length, 1);
assert.equal(retryCreate.data.length, 1);
assert.equal(firstCreate.data[0].id, retryCreate.data[0].id);
assert.equal(retryCreate.data[0].was_duplicate, true);

const forbiddenRead = await organizationA.rpc("get_account_activity", {
  p_account_id: foreignAccountId,
});
assert.ok(forbiddenRead.error, "Cross-tenant read should be denied.");
assert.equal(forbiddenRead.error.code, "42501");

const forbiddenCreate = await organizationA.rpc("create_account_note", {
  p_account_id: foreignAccountId,
  p_body: "This cross-tenant write must fail.",
  p_idempotency_key: "90000000-0000-4000-8000-000000000002",
});
assert.ok(forbiddenCreate.error, "Cross-tenant create should be denied.");
assert.equal(forbiddenCreate.error.code, "42501");

console.log(
  JSON.stringify(
    {
      successfulRead: true,
      successfulCreate: true,
      newestFirst: activity.every(
        (entry, index) =>
          index === 0 || new Date(activity[index - 1].created_at) >= new Date(entry.created_at),
      ),
      idempotentRetry: {
        sameEntryId: true,
        wasDuplicate: retryCreate.data[0].was_duplicate,
      },
      crossTenantReadDenied: forbiddenRead.error.code,
      crossTenantCreateDenied: forbiddenCreate.error.code,
    },
    null,
    2,
  ),
);

