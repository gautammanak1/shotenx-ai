import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { email: string; name: string } = { email: "", name: "Guest" };

  if (url && key) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (u) {
      user = {
        email: u.email ?? "",
        name: (u.user_metadata?.full_name as string | undefined) ?? "",
      };
    }
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
