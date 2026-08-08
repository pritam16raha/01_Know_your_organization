import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LoginForm, type DemoIdentity } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

type DemoCredentialFile = {
  organizationA: { email: string; password: string };
  organizationB: { email: string; password: string };
};

async function loadDemoIdentities(): Promise<DemoIdentity[]> {
  try {
    const contents = await readFile(resolve(process.cwd(), ".demo-credentials.json"), "utf8");
    const credentials = JSON.parse(contents) as DemoCredentialFile;

    return [
      {
        id: "organization-a",
        label: "Organization A",
        organization: "Northstar Labs",
        userName: "Pritam Raha",
        ...credentials.organizationA,
      },
      {
        id: "organization-b",
        label: "Organization B",
        organization: "Rival Systems",
        userName: "Alex Rival",
        ...credentials.organizationB,
      },
    ];
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  return <LoginForm demoIdentities={await loadDemoIdentities()} />;
}
