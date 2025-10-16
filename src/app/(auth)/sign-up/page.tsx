"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, UserPlus, LogIn } from "lucide-react";

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
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <BookOpen className="relative h-14 w-14 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Create account</CardTitle>
          <CardDescription className="text-base mt-2">
            Sign up to start your reading journey with BookMarked
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
                placeholder="Create a password"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Password must be at least 6 characters and contain both letters and digits.
              </p>
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="w-full h-11 text-base shadow-md hover:shadow-lg transition-all" 
              disabled={!!status && status.includes("Creating")}
            >
              {status && status.includes("Creating") ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create account
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6">
            <Separator />
            <div className="mt-4 text-center">
              <Button variant="link" asChild className="text-sm font-medium">
                <Link href="/sign-in">
                  <LogIn className="h-4 w-4 mr-2" />
                  Already have an account? Sign in
                </Link>
              </Button>
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


