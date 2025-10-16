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
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <BookOpen className="relative h-14 w-14 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {mode === "sign-in" 
              ? "Sign in to access your library" 
              : "Sign up to start your reading journey"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
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
                className="h-11"
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
                className="h-11"
              />
              {mode === "sign-up" && (
                <p className="text-xs text-muted-foreground pt-1">
                  Password must be at least 6 characters and contain both letters and digits.
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base shadow-md hover:shadow-lg transition-all" 
              size="lg"
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
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign in
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create account
                    </>
                  )}
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6">
            <Separator />
            <div className="mt-4 text-center">
              {mode === "sign-in" ? (
                <Button variant="link" onClick={() => setMode("sign-up")} className="text-sm font-medium">
                  Don&apos;t have an account? Create one
                </Button>
              ) : (
                <Button variant="link" onClick={() => setMode("sign-in")} className="text-sm font-medium">
                  Already have an account? Sign in
                </Button>
              )}
            </div>
          </div>
          
          {status && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-muted-foreground/20">
              <p className="text-sm text-foreground">{status}</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Button variant="ghost" asChild className="text-sm">
              <Link href="/">← Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


