"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Sparkles, Cloud, Lock, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Enhanced gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1)_0%,transparent_50%)]"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            {/* Icon with animation */}
            <div className={`inline-flex items-center justify-center ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"></div>
                <div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20">
                  <BookOpen className="h-16 w-16 md:h-20 md:w-20 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            
            {/* Heading with stagger animation */}
            <div className={`space-y-4 ${mounted ? '' : 'opacity-0'}`}>
              <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${mounted ? 'animate-fade-in-up' : ''}`}>
                <span className="gradient-text">BookMarked</span>
              </h1>
              <p className={`text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed ${mounted ? 'animate-fade-in-up animation-delay-200' : ''}`}>
                Your personal digital library. Read, organize, and sync your books across all devices.
              </p>
            </div>

            {/* CTA Button */}
            <div className={`flex justify-center pt-4 ${mounted ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
              <Button asChild size="lg" className="text-base px-8 h-12 shadow-lg hover:shadow-xl smooth-transition group">
                <Link href={signedIn ? "/library" : "/sign-in"}>
                  {signedIn ? "Open Library" : "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 smooth-transition" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-16 md:py-24 ${mounted ? 'animate-fade-in animation-delay-600' : 'opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-lg smooth-transition border-muted hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 smooth-transition">
                  <Cloud className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cloud Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Your library and reading progress synced seamlessly across all your devices.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg smooth-transition border-muted hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 smooth-transition">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Beautiful Reader</h3>
                  <p className="text-sm text-muted-foreground">
                    Enjoy a distraction-free reading experience with customizable themes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg smooth-transition border-muted hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 smooth-transition">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Offline Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Read your books anytime, anywhere with full offline support via PWA.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg smooth-transition border-muted hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 smooth-transition">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Private & Secure</h3>
                  <p className="text-sm text-muted-foreground">
                    Your books and data are encrypted and stored securely in your account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
