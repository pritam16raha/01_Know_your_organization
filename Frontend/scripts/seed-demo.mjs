import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

const env = { ...readEnv(resolve(root, ".env")), ...process.env };
const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
];

for (const key of required) {
  if (!env[key]) throw new Error(`Missing ${key} in Frontend/.env`);
}

const credentialPath = resolve(root, ".demo-credentials.json");
const credentials = existsSync(credentialPath)
  ? JSON.parse(readFileSync(credentialPath, "utf8"))
  : {
      organizationA: {
        email: "pritam@northstar.test",
        password: `Demo-${randomBytes(18).toString("base64url")}`,
      },
      organizationB: {
        email: "alex@rival.test",
        password: `Demo-${randomBytes(18).toString("base64url")}`,
      },
    };

writeFileSync(credentialPath, `${JSON.stringify(credentials, null, 2)}\n`, {
  mode: 0o600,
});

const keyResponse = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/api-keys`,
  { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } },
);

if (!keyResponse.ok) {
  throw new Error(`Unable to retrieve project API keys (${keyResponse.status}).`);
}

const apiKeys = await keyResponse.json();
const serviceRoleKey = apiKeys.find((key) => key.name === "service_role")?.api_key;
if (!serviceRoleKey) throw new Error("The management API did not return a service-role key.");

const admin = createClient(env.SUPABASE_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser({ email, password }, displayName) {
  const { data: existing, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const user = existing.users.find((candidate) => candidate.email === email);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw error;
  return data.user;
}

const userA = await ensureUser(credentials.organizationA, "Pritam Raha");
const userB = await ensureUser(credentials.organizationB, "Alex Rival");

const organizations = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Northstar Labs" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Rival Systems" },
];
const accounts = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    organization_id: organizations[0].id,
    name: "Acme Corporation",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    organization_id: organizations[0].id,
    name: "Globex Retail",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    organization_id: organizations[1].id,
    name: "Rival Confidential Account",
  },
];

for (const [table, rows] of [
  ["organizations", organizations],
  [
    "memberships",
    [
      {
        organization_id: organizations[0].id,
        user_id: userA.id,
        display_name: "Pritam Raha",
        role: "owner",
      },
      {
        organization_id: organizations[1].id,
        user_id: userB.id,
        display_name: "Alex Rival",
        role: "owner",
      },
    ],
  ],
  ["accounts", accounts],
]) {
  const { error } = await admin.from(table).upsert(rows);
  if (error) throw error;
}

async function userClient({ email, password }) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

const northstar = await userClient(credentials.organizationA);
const rival = await userClient(credentials.organizationB);

const notes = [
  "Customer requested updated enterprise pricing and a security questionnaire.",
  "Demo completed. Main concern is SSO support and implementation timeline.",
  "Intro call completed. Follow-up scheduled with the procurement team.",
];

for (let index = 0; index < notes.length; index += 1) {
  const { error } = await northstar.rpc("create_account_note", {
    p_account_id: accounts[0].id,
    p_body: notes[index],
    p_idempotency_key: `50000000-0000-4000-8000-00000000000${index + 1}`,
  });
  if (error) throw error;
}

const { error: rivalNoteError } = await rival.rpc("create_account_note", {
  p_account_id: accounts[2].id,
  p_body: "This note must never be visible to Northstar Labs.",
  p_idempotency_key: "50000000-0000-4000-8000-000000000004",
});
if (rivalNoteError) throw rivalNoteError;

console.log("Demo users and tenant data are ready.");
console.log(`Local credentials: ${credentialPath}`);
