"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { signInSchema, sanitizeInput } from "@/lib/validation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

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
    setStatus("Processing...");
    
    try {
      // Validate and sanitize input
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);
      
      const validation = signInSchema.safeParse({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });
      
      if (!validation.success) {
        setStatus(validation.error.errors[0].message);
        return;
      }
      
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({ 
          email: validation.data.email, 
          password: validation.data.password 
        });
        setStatus(error ? error.message : "Check your email to confirm your account.");
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({ 
        email: validation.data.email, 
        password: validation.data.password 
      });
      
      if (error) setStatus(error.message);
      else setStatus(null);
    } catch (error) {
      setStatus("An unexpected error occurred. Please try again.");
      console.error("Auth error:", error);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-xl border-muted animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="relative bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <BookOpen className="h-12 w-12 text-primary" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">
              {mode === "sign-in" ? "Welcome back" : "Get started"}
            </CardTitle>
            <CardDescription className="text-base">
              {mode === "sign-in" 
                ? "Sign in to access your library" 
                : "Create an account to start your reading journey"
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 smooth-transition focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 smooth-transition focus:border-primary"
              />
              {mode === "sign-up" && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Password must be at least 6 characters and contain both letters and digits.
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-lg hover:shadow-xl smooth-transition" 
              disabled={!!status && status.includes("Processing")}
            >
              {status && status.includes("Processing") ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {mode === "sign-in" ? (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign in
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create account
                    </>
                  )}
                </>
              )}
            </Button>
          </form>
          
          <div className="relative">
            <Separator className="my-6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">OR</span>
            </div>
          </div>
          
          <div className="text-center">
            {mode === "sign-in" ? (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setMode("sign-up");
                  setStatus(null);
                }} 
                className="text-sm font-medium smooth-transition hover:bg-primary/10"
              >
                Don&apos;t have an account? <span className="text-primary ml-1">Create one</span>
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setMode("sign-in");
                  setStatus(null);
                }} 
                className="text-sm font-medium smooth-transition hover:bg-primary/10"
              >
                Already have an account? <span className="text-primary ml-1">Sign in</span>
              </Button>
            )}
          </div>
          
          {status && (
            <div className="p-4 rounded-lg bg-muted/50 border border-muted animate-fade-in">
              <p className="text-sm text-center">{status}</p>
            </div>
          )}
          
          <div className="text-center pt-2">
            <Button variant="ghost" asChild className="smooth-transition">
              <Link href="/" className="text-sm">
                ← Back to home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


