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
    
    // Close mobile menu on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      subscription.subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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
      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
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
          <div className="lg:hidden border-t border-border bg-card/98 backdrop-blur-md animate-slide-down shadow-2xl">
            <nav className="flex flex-col p-6 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Navigation Links */}
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  asChild 
                  className="w-full justify-start h-14 rounded-2xl hover:bg-primary/10 smooth-transition group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/" className="flex items-center gap-4 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 smooth-transition">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-base font-semibold">Home</span>
                      <span className="text-xs text-muted-foreground">Welcome page</span>
                    </div>
                  </Link>
                </Button>
                
                <Button 
                  variant="ghost" 
                  asChild 
                  className="w-full justify-start h-14 rounded-2xl hover:bg-primary/10 smooth-transition group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/library" className="flex items-center gap-4 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 smooth-transition">
                      <Library className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-base font-semibold">Library</span>
                      <span className="text-xs text-muted-foreground">Your books</span>
                    </div>
                  </Link>
                </Button>
              </div>
              
              {/* Auth Section */}
              <div className="pt-6 mt-4 border-t border-border">
                {signedIn ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start h-14 rounded-2xl hover:bg-destructive/10 smooth-transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 smooth-transition">
                      <LogOut className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex flex-col items-start ml-4">
                      <span className="text-base font-semibold text-destructive">Sign Out</span>
                      <span className="text-xs text-muted-foreground">End your session</span>
                    </div>
                  </Button>
                ) : (
                  <Button 
                    variant="default"
                    asChild 
                    className="w-full justify-center h-14 rounded-2xl shadow-xl font-semibold text-base smooth-transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/sign-in" className="cursor-pointer flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      <span>Sign In</span>
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
