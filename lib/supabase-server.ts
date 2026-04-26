import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/transactions", "/demo", "/register", "/help", "/marketplace"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isLoginPage = pathname === "/login";

  // public routes — do nothing, don't touch cookies
  if (!isProtected && !isLoginPage) {
    return NextResponse.next({ request });
  }

  // If Supabase is not configured (common in local dev), skip auth middleware.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
