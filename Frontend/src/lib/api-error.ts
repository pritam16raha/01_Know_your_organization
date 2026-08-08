import { NextResponse } from "next/server";

type DatabaseError = { code?: string; message?: string };

export function databaseErrorResponse(error: DatabaseError) {
  if (error.code === "42501") {
    return NextResponse.json(
      { error: "Account not found or is not accessible." },
      { status: 403 },
    );
  }

  if (["22004", "22023", "22P02", "23514"].includes(error.code ?? "")) {
    return NextResponse.json(
      { error: error.message ?? "The request is invalid." },
      { status: 400 },
    );
  }

  console.error("Database operation failed", { code: error.code });
  return NextResponse.json(
    { error: "The server could not complete the request." },
    { status: 500 },
  );
}

