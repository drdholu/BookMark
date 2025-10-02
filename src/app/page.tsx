"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(!!user);
    })();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">BookMark</h1>
      <p className="opacity-80">Read your books on web and PWA with sync.</p>
      <div className="flex gap-3">
        {!signedIn && (
          <a href="/sign-in" className="border rounded px-3 py-2">Sign in</a>
        )}
        <a href="/library" className="border rounded px-3 py-2">Go to Library</a>
      </div>
    </div>
  );
}
