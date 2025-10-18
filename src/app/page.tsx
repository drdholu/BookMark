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
    <div className="min-h-screen pattern-bg">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 md:py-28 lg:py-40 overflow-hidden">
        {/* Enhanced cozy gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.2)_0%,transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.15)_0%,transparent_60%)]"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '4s'}}></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/8 rounded-full blur-[140px] animate-pulse" style={{animationDuration: '6s'}}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 sm:space-y-10 md:space-y-12">
            {/* Icon with enhanced animation */}
            <div className={`inline-flex items-center justify-center ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
              <div className="relative warm-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-gradient-to-br from-primary/20 to-accent/10 p-6 sm:p-8 md:p-10 rounded-3xl border-2 border-primary/30 shadow-2xl">
                  <BookOpen className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 text-primary drop-shadow-lg" strokeWidth={1.8} />
                </div>
              </div>
            </div>
            
            {/* Heading with stagger animation */}
            <div className={`space-y-4 sm:space-y-6 ${mounted ? '' : 'opacity-0'}`}>
              <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight ${mounted ? 'animate-fade-in-up' : ''}`}>
                <span className="gradient-text drop-shadow-sm">BookMarked</span>
              </h1>
              <p className={`text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed px-4 ${mounted ? 'animate-fade-in-up animation-delay-200' : ''}`}>
                Your personal sanctuary for digital reading. Curate, organize, and enjoy your books across all devices with effortless sync.
              </p>
            </div>

            {/* CTA Button with extra polish */}
            <div className={`flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 ${mounted ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
              <Button 
                asChild 
                size="lg" 
                className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto shadow-2xl hover:shadow-[0_20px_60px_-15px] hover:shadow-primary/40 smooth-transition group font-semibold rounded-xl"
              >
                <Link href={signedIn ? "/library" : "/sign-in"}>
                  {signedIn ? "Open Library" : "Get Started"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 smooth-transition" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with enhanced design */}
      <section className={`py-12 sm:py-16 md:py-20 lg:py-28 ${mounted ? 'animate-fade-in animation-delay-600' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need for a cozy reading experience
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Thoughtfully designed features to make digital reading delightful
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <Card className="cozy-card group border-2">
              <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Cloud className="h-7 w-7 sm:h-8 sm:w-8 text-primary" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg sm:text-xl">Cloud Sync</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Your library and reading progress synced seamlessly across all your devices.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cozy-card group border-2">
              <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-accent" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg sm:text-xl">Beautiful Reader</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Enjoy a distraction-free reading experience with customizable themes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cozy-card group border-2">
              <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-primary" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg sm:text-xl">Offline Ready</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Read your books anytime, anywhere with full offline support via PWA.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cozy-card group border-2">
              <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 smooth-transition shadow-lg">
                  <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-accent" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg sm:text-xl">Private & Secure</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
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
