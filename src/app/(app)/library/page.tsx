"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(user?.email ?? null);
      setLoading(false);
    })();
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!email) {
    return (
      <div className="p-6 space-y-4">
        <p>You need to sign in to view your library.</p>
        <Link className="underline" href="/sign-in">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Library</h1>
        <button
          className="border rounded px-3 py-1"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
      </div>
      <p className="opacity-70">Signed in as {email}</p>
      <div className="rounded border p-6 text-sm opacity-80">
        Placeholder: uploads and book list will appear here.
      </div>
    </div>
  );
}


