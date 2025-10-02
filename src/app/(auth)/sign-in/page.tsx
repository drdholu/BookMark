"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/library");
      }
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Processing...");
    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({ email, password });
      setStatus(error ? error.message : "Check your email to confirm your account.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus(error.message);
    else setStatus(null);
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">{mode === "sign-in" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2 bg-background"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="w-full border rounded px-3 py-2 bg-background"
        />
        <button type="submit" className="w-full border rounded px-3 py-2">
          {mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <div className="mt-4 text-sm">
        {mode === "sign-in" ? (
          <button className="underline" onClick={() => setMode("sign-up")}>Create an account</button>
        ) : (
          <button className="underline" onClick={() => setMode("sign-in")}>Have an account? Sign in</button>
        )}
      </div>
      {status && <p className="mt-3 text-sm opacity-80">{status}</p>}
    </div>
  );
}


