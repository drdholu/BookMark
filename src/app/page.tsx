"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Sparkles, Cloud, Lock, Zap, Library, Bookmark, Star } from "lucide-react";
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
      {/* Hero Section - Asymmetric Modern Layout */}
      <section className="relative overflow-hidden">
        {/* Modern gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent/15 via-primary/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className={`space-y-8 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-semibold text-primary">Your Digital Reading Companion</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight">
                <span className="text-foreground">Read</span>
                <br />
                <span className="text-primary">Anywhere,</span>
                <br />
                <span className="text-foreground">Anytime</span>
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                Your personal library in the cloud. Organize, read, and sync your books seamlessly across all devices.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="text-lg px-8 h-14 shadow-xl hover:shadow-2xl hover:shadow-primary/20 smooth-transition group font-bold rounded-2xl"
                >
                  <Link href={signedIn ? "/library" : "/sign-in"}>
                    {signedIn ? "Open Library" : "Start Reading Free"}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 smooth-transition" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 h-14 border-2 hover:bg-muted/50 smooth-transition font-semibold rounded-2xl"
                >
                  <Link href="#features">
                    Learn More
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-8 border-t border-border/50">
                <div>
                  <div className="text-3xl font-bold text-foreground">Free</div>
                  <div className="text-sm text-muted-foreground">Forever Plan</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">Unlimited</div>
                  <div className="text-sm text-muted-foreground">Storage</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">Secure</div>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className={`relative ${mounted ? 'animate-fade-in animation-delay-200' : 'opacity-0'}`}>
              <div className="relative aspect-square max-w-[600px] mx-auto">
                {/* Decorative cards */}
                <div className="absolute inset-0">
                  <Card className="absolute top-0 right-0 w-3/5 rotate-6 shadow-2xl border-2 hover:rotate-12 smooth-transition">
                    <CardContent className="p-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-3/4 bg-muted rounded"></div>
                        <div className="h-3 w-full bg-muted/50 rounded"></div>
                        <div className="h-3 w-2/3 bg-muted/50 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="absolute bottom-12 left-0 w-3/5 -rotate-6 shadow-2xl border-2 hover:-rotate-12 smooth-transition">
                    <CardContent className="p-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <Library className="w-8 h-8 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-3/4 bg-muted rounded"></div>
                        <div className="h-3 w-full bg-muted/50 rounded"></div>
                        <div className="h-3 w-2/3 bg-muted/50 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 shadow-2xl border-2 z-10 hover:scale-105 smooth-transition">
                    <CardContent className="p-10 space-y-6">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary/50 flex items-center justify-center shadow-lg">
                        <Bookmark className="w-10 h-10 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-3">
                        <div className="h-5 w-4/5 bg-muted rounded"></div>
                        <div className="h-4 w-full bg-muted/50 rounded"></div>
                        <div className="h-4 w-3/4 bg-muted/50 rounded"></div>
                        <div className="h-4 w-5/6 bg-muted/50 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid Layout */}
      <section id="features" className="py-20 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-24">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Everything You Need
            </h2>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Powerful features designed for the modern reader
            </p>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Large Featured Card */}
            <Card className="md:col-span-2 lg:col-span-2 lg:row-span-2 cozy-card group border-2 overflow-hidden">
              <CardContent className="p-10 lg:p-12 h-full flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-xl border-2 border-primary/20">
                    <Cloud className="h-10 w-10 text-primary" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl lg:text-4xl font-bold">Seamless Cloud Sync</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Your entire library syncs automatically across all your devices. Start reading on your phone, continue on your tablet, and finish on your desktop without missing a beat.
                    </p>
                  </div>
                </div>
                <div className="pt-8">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span>Real-time sync</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>End-to-end encrypted</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smaller Cards */}
            <Card className="cozy-card group border-2">
              <CardContent className="p-8 lg:p-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Sparkles className="h-8 w-8 text-accent" strokeWidth={2.5} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Beautiful Reader</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Distraction-free reading with customizable themes and layouts.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cozy-card group border-2">
              <CardContent className="p-8 lg:p-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Zap className="h-8 w-8 text-primary" strokeWidth={2.5} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Lightning Fast</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Optimized performance with instant page loads and smooth navigation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-2 cozy-card group border-2">
              <CardContent className="p-8 lg:p-10 flex flex-col md:flex-row gap-8 items-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-xl border-2 border-accent/20 flex-shrink-0">
                  <Lock className="h-10 w-10 text-accent" strokeWidth={2.5} />
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-2xl lg:text-3xl font-bold">Privacy First</h3>
                  <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                    Your books and data are encrypted and stored securely. We respect your privacy and never track your reading habits.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
            <CardContent className="relative p-12 lg:p-20 text-center space-y-8">
              <div className="space-y-6 max-w-3xl mx-auto">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                  Start Your Reading Journey Today
                </h2>
                <p className="text-xl sm:text-2xl text-muted-foreground">
                  Join thousands of readers who trust BookMarked for their digital library
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="text-lg px-12 h-16 shadow-2xl hover:shadow-primary/30 smooth-transition group font-bold rounded-2xl"
                >
                  <Link href={signedIn ? "/library" : "/sign-in"}>
                    {signedIn ? "Go to Library" : "Get Started Free"}
                    <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 smooth-transition" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
