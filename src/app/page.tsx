"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--primary)/0.12)_0%,transparent_100%)]"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-10">
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                <BookOpen className="relative h-16 w-16 md:h-24 md:w-24 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                BookMarked
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Your personal digital library. Read your books anywhere, sync your progress seamlessly across all devices.
              </p>
            </div>

            <div className="flex justify-center pt-6">
              <Button asChild size="lg" className="text-base px-10 h-12 shadow-lg hover:shadow-xl transition-all">
                <Link href={signedIn ? "/library" : "/sign-in"}>
                  {signedIn ? "Open Library" : "Get Started"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
