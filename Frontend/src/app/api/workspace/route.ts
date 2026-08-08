import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkspaceRow = {
  organization_id: string;
  organization_name: string;
  display_name: string;
  account_id: string | null;
  account_name: string | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase.rpc("get_my_workspace");
  if (error) return databaseErrorResponse(error);

  const rows = (data ?? []) as WorkspaceRow[];
  const first = rows[0];
  if (!first) {
    return NextResponse.json(
      { error: "Your user is not assigned to an organization." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    organization: { id: first.organization_id, name: first.organization_name },
    user: { email: user.email ?? "", displayName: first.display_name },
    accounts: rows
      .filter((row) => row.account_id && row.account_name)
      .map((row) => ({ id: row.account_id, name: row.account_name })),
  });
}

