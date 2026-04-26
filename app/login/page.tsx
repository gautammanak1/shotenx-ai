"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Github, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const authConfigured = Boolean(supabase);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
      router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: "google" | "github") => {
    if (!supabase) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        <Link href="/" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-blue-600">
            <Zap className="h-4 w-4 fill-white text-white" />
          </div>
          <span className="text-base font-bold text-foreground">ShotenX AI</span>
        </Link>

        <div className="border border-border bg-card p-8">
          {/* Tabs */}
          <div className="mb-6 flex border border-border">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setMessage(""); }}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  mode === m ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {m === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* OAuth */}
          <div className="space-y-2 mb-5">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!authConfigured}
              className="flex w-full items-center justify-center gap-2.5 border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("github")}
              disabled={!authConfigured}
              className="flex w-full items-center justify-center gap-2.5 border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
              <div className="flex items-center border border-border bg-muted/30 px-3 h-9">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
              <div className="flex items-center border border-border bg-muted/30 px-3 h-9">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="ml-2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {message && <p className="text-xs text-green-600 dark:text-green-400">{message}</p>}

            <button
              type="submit"
              disabled={loading || !authConfigured}
              className="w-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/" className="text-foreground hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}
