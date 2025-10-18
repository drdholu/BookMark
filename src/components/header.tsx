"use client"

import Link from "next/link"
import { BookOpen, Home, Library, LogIn, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function Header() {
  const [mounted, setMounted] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSignedIn(!!user)
    }
    
    checkAuth()
    
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1400px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <span className="text-base sm:text-lg font-bold">BookMarked</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="h-9 w-9 bg-muted rounded-lg" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1400px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-xl blur-lg group-hover:blur-xl smooth-transition"></div>
                <div className="relative bg-gradient-to-br from-primary/15 to-accent/10 p-2 sm:p-2.5 rounded-xl border-2 border-primary/30 group-hover:border-primary/50 smooth-transition shadow-md">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold truncate text-foreground hover:text-primary smooth-transition">
                BookMarked
              </span>
            </Link>
            
            <Separator orientation="vertical" className="h-6 hidden lg:block" />
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="smooth-transition hover:bg-primary/15 hover:text-primary rounded-xl h-10 px-4"
              >
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                  <Home className="h-4 w-4" />
                  <span className="text-sm font-semibold">Home</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="smooth-transition hover:bg-primary/15 hover:text-primary rounded-xl h-10 px-4"
              >
                <Link href="/library" className="flex items-center gap-2 cursor-pointer">
                  <Library className="h-4 w-4" />
                  <span className="text-sm font-semibold">Library</span>
                </Link>
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 dark:text-yellow-400 border-2 border-yellow-500/40 animate-pulse shadow-lg">
                Offline
              </span>
            )}
            
            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {signedIn ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="flex items-center gap-1.5 cursor-pointer smooth-transition hover:bg-destructive/15 hover:text-destructive rounded-xl h-10 px-4"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-semibold">Sign Out</span>
                </Button>
              ) : (
                <Button 
                  variant="default"
                  size="sm" 
                  asChild 
                  className="flex items-center gap-1.5 smooth-transition rounded-xl h-10 px-4 shadow-lg hover:shadow-xl font-semibold"
                >
                  <Link href="/sign-in" className="cursor-pointer">
                    <LogIn className="h-4 w-4" />
                    <span className="text-sm">Sign In</span>
                  </Link>
                </Button>
              )}
            </div>
            
            <ThemeToggle />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-10 w-10 p-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card/98 backdrop-blur-md">
            <nav className="flex flex-col p-4 space-y-2">
              <Button 
                variant="ghost" 
                asChild 
                className="justify-start h-12 rounded-xl hover:bg-primary/15"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/" className="flex items-center gap-3 cursor-pointer">
                  <Home className="h-5 w-5" />
                  <span className="text-base font-semibold">Home</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                asChild 
                className="justify-start h-12 rounded-xl hover:bg-primary/15"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/library" className="flex items-center gap-3 cursor-pointer">
                  <Library className="h-5 w-5" />
                  <span className="text-base font-semibold">Library</span>
                </Link>
              </Button>
              
              <div className="pt-4 border-t border-border mt-2">
                {signedIn ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start h-12 rounded-xl hover:bg-destructive/15 text-destructive"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span className="text-base font-semibold">Sign Out</span>
                  </Button>
                ) : (
                  <Button 
                    variant="default"
                    asChild 
                    className="w-full justify-start h-12 rounded-xl shadow-lg font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/sign-in" className="cursor-pointer">
                      <LogIn className="h-5 w-5 mr-3" />
                      <span className="text-base">Sign In</span>
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
