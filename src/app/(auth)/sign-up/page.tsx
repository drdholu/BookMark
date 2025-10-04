"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/library");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    setStatus(error ? error.message : "Check your email to confirm your account.");
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">Create account</h1>
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
          Sign up
        </button>
      </form>
      <div className="mt-4 text-sm">
        <Link className="underline" href="/sign-in">Have an account? Sign in</Link>
      </div>
      {status && <p className="mt-3 text-sm opacity-80">{status}</p>}
    </div>
  );
}


