"use client"

import Link from "next/link"
import { BookOpen, Home, Library, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function Header() {
  const [mounted, setMounted] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // Check auth status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSignedIn(!!user)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    
    return () => subscription.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 cursor-pointer">
              <div className="h-5 w-5 bg-muted rounded" />
              <span className="text-lg font-bold">BookMarked</span>
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <nav className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center space-x-1">
                  <div className="h-3 w-3 bg-muted rounded" />
                  <span className="text-sm">Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library" className="flex items-center space-x-1">
                  <div className="h-3 w-3 bg-muted rounded" />
                  <span className="text-sm">Library</span>
                </Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">BookMarked</span>
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center space-x-1 cursor-pointer">
                <Home className="h-3 w-3" />
                <span className="text-sm">Home</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library" className="flex items-center space-x-1">
                <Library className="h-3 w-3" />
                <span className="text-sm">Library</span>
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          {signedIn ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center space-x-1 cursor-pointer">
              <LogOut className="h-3 w-3" />
              <span className="text-sm">Sign Out</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild className="flex items-center space-x-1">
              <Link href="/sign-in">
                <LogIn className="h-3 w-3" />
                <span className="text-sm">Sign In</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
