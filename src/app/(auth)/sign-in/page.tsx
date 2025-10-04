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
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in" 
              ? "Sign in to access your library" 
              : "Sign up to start your reading journey"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              {mode === "sign-up" && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters and contain both letters and digits.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!!status && status.includes("Processing")}>
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
                <Button variant="link" onClick={() => setMode("sign-up")} className="text-sm">
                  Don&apos;t have an account? Create one
                </Button>
              ) : (
                <Button variant="link" onClick={() => setMode("sign-in")} className="text-sm">
                  Already have an account? Sign in
                </Button>
              )}
            </div>
          </div>
          
          {status && (
            <div className="mt-4 p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Button variant="ghost" asChild>
              <Link href="/">← Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


