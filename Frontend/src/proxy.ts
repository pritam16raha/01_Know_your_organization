import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user } = await refreshSession(request);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!user && !isLogin && !request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
