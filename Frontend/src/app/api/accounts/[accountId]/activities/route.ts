import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accountIdSchema, createNoteSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ accountId: string }> };
type ActivityRow = {
  id: string;
  account_id: string;
  body: string;
  author_user_id: string;
  author_name: string;
  created_at: string;
  was_duplicate?: boolean;
};

function activity(row: ActivityRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    body: row.body,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(_request: Request, context: RouteContext) {
  const parsedAccountId = accountIdSchema.safeParse((await context.params).accountId);
  if (!parsedAccountId.success) {
    return NextResponse.json({ error: "Invalid account identifier." }, { status: 400 });
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase.rpc("get_account_activity", {
    p_account_id: parsedAccountId.data,
  });
  if (error) return databaseErrorResponse(error);

  return NextResponse.json({ activities: ((data ?? []) as ActivityRow[]).map(activity) });
}

export async function POST(request: Request, context: RouteContext) {
  const parsedAccountId = accountIdSchema.safeParse((await context.params).accountId);
  if (!parsedAccountId.success) {
    return NextResponse.json({ error: "Invalid account identifier." }, { status: 400 });
  }

  const parsedBody = createNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid note." },
      { status: 400 },
    );
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase.rpc("create_account_note", {
    p_account_id: parsedAccountId.data,
    p_body: parsedBody.data.body,
    p_idempotency_key: parsedBody.data.idempotencyKey,
  });
  if (error) return databaseErrorResponse(error);

  const row = (data as ActivityRow[] | null)?.[0];
  if (!row) return NextResponse.json({ error: "The note could not be returned." }, { status: 500 });

  return NextResponse.json(
    { activity: activity(row), wasDuplicate: Boolean(row.was_duplicate) },
    { status: row.was_duplicate ? 200 : 201 },
  );
}

