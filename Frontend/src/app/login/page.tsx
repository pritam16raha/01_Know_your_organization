import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LoginForm, type DemoIdentity } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

type DemoCredentialFile = {
  organizationA: { email: string; password: string };
  organizationB: { email: string; password: string };
};

const demoEnvironmentKeys = [
  "DEMO_ORG_A_EMAIL",
  "DEMO_ORG_A_PASSWORD",
  "DEMO_ORG_B_EMAIL",
  "DEMO_ORG_B_PASSWORD",
] as const;

function toDemoIdentities(credentials: DemoCredentialFile): DemoIdentity[] {
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
}

function loadEnvironmentIdentities(): DemoIdentity[] | null {
  const missingKeys = demoEnvironmentKeys.filter((key) => !process.env[key]);

  if (missingKeys.length === 0) {
    return toDemoIdentities({
      organizationA: {
        email: process.env.DEMO_ORG_A_EMAIL!,
        password: process.env.DEMO_ORG_A_PASSWORD!,
      },
      organizationB: {
        email: process.env.DEMO_ORG_B_EMAIL!,
        password: process.env.DEMO_ORG_B_PASSWORD!,
      },
    });
  }

  const configuredKeyCount = demoEnvironmentKeys.length - missingKeys.length;
  if (configuredKeyCount > 0) {
    console.error(
      `Quick demo access disabled because these environment variables are missing: ${missingKeys.join(", ")}`,
    );
    return [];
  }

  return null;
}

async function loadDemoIdentities(): Promise<DemoIdentity[]> {
  const environmentIdentities = loadEnvironmentIdentities();

  if (environmentIdentities !== null) {
    return environmentIdentities;
  }

  try {
    const contents = await readFile(resolve(process.cwd(), ".demo-credentials.json"), "utf8");
    const credentials = JSON.parse(contents) as DemoCredentialFile;
    return toDemoIdentities(credentials);
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  return <LoginForm demoIdentities={await loadDemoIdentities()} />;
}
