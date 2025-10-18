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
  const [isOnline, setIsOnline] = useState(true)

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
    
    // Online/offline listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
    
    return () => {
      subscription.subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 cursor-pointer min-w-0">
              <div className="h-5 w-5 bg-muted rounded" />
              <span className="text-lg font-bold truncate">BookMarked</span>
            </Link>
            <Separator orientation="vertical" className="h-4 hidden xs:block" />
            <nav className="hidden sm:flex items-center gap-1 flex-wrap">
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 cursor-pointer min-w-0 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg group-hover:blur-xl smooth-transition"></div>
              <div className="relative bg-primary/10 p-1.5 rounded-lg border border-primary/20 group-hover:border-primary/40 smooth-transition">
                <BookOpen className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
            </div>
            <span className="text-lg font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">BookMarked</span>
          </Link>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <nav className="hidden sm:flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" asChild className="smooth-transition hover:bg-primary/10">
              <Link href="/" className="flex items-center gap-1.5 cursor-pointer">
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Home</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="smooth-transition hover:bg-primary/10">
              <Link href="/library" className="flex items-center gap-1.5 cursor-pointer">
                <Library className="h-4 w-4" />
                <span className="text-sm font-medium">Library</span>
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 animate-pulse">
              Offline
            </span>
          )}
          {signedIn ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut} 
              className="flex items-center gap-1.5 cursor-pointer smooth-transition hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              asChild 
              className="flex items-center gap-1.5 smooth-transition hover:bg-primary/10"
            >
              <Link href="/sign-in" className="cursor-pointer">
                <LogIn className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Sign In</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
