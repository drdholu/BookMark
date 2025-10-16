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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer min-w-0 group">
              <div className="h-6 w-6 bg-muted rounded" />
              <span className="text-xl font-semibold truncate">BookMarked</span>
            </Link>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <nav className="hidden sm:flex items-center gap-1 flex-wrap">
              <Button variant="ghost" size="default" className="h-9" asChild>
                <Link href="/" className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-muted rounded" />
                  <span>Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="default" className="h-9" asChild>
                <Link href="/library" className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-muted rounded" />
                  <span>Library</span>
                </Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-muted rounded" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer min-w-0 group transition-colors">
            <BookOpen className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" strokeWidth={2} />
            <span className="text-xl font-semibold truncate group-hover:text-primary/90 transition-colors">BookMarked</span>
          </Link>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <nav className="hidden sm:flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="default" className="h-9" asChild>
              <Link href="/" className="flex items-center space-x-2 cursor-pointer">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </Button>
            <Button variant="ghost" size="default" className="h-9" asChild>
              <Link href="/library" className="flex items-center space-x-2">
                <Library className="h-4 w-4" />
                <span>Library</span>
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border border-yellow-500/30">
              Offline
            </span>
          )}
          {signedIn ? (
            <Button variant="ghost" size="default" className="h-9" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign Out</span>
            </Button>
          ) : (
            <Button variant="ghost" size="default" className="h-9" asChild>
              <Link href="/sign-in">
                <LogIn className="h-4 w-4 mr-2" />
                <span>Sign In</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
