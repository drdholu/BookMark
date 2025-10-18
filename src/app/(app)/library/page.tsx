"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { uploadToBucket, getPublicUrl } from "@/lib/storage";
import { useCallback } from "react";
import { BookRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Upload, FileText, FileImage, Trash2 } from "lucide-react";

export default function LibraryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  async function refreshBooks(retryCount = 0) {
    const maxRetries = 2;
    
    try {
      // Add timeout to detect hanging queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database query timeout after 8 seconds")), 8000)
      );
      
      const queryPromise = supabase
        .from("books")
        .select("*")
        .order("uploaded_at", { ascending: false });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error("Error fetching books:", error);
        return;
      }
      
      setBooks(data as unknown as BookRow[]);
    } catch (error) {
      // Retry logic for timeout errors
      if (retryCount < maxRetries && error instanceof Error && error.message.includes("timeout")) {
        setLoadingMessage(`Connection timeout, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return refreshBooks(retryCount + 1);
      }
      
      console.error("Error in refreshBooks:", error);
    }
  }

  useEffect(() => {
    let active = true;
    
    const loadLibrary = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (!active) return;
        
        if (!user) {
          router.replace("/");
          return;
        }
        
        setEmail(user.email ?? null);
        await refreshBooks();
        setLoading(false);
      } catch (error) {
        console.error("Error loading library:", error);
        if (active) {
          setLoading(false);
        }
      }
    };

    // Add a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (active) {
        setLoading(false);
      }
    }, 25000); // 25 second safety timeout (allows for retries)

    loadLibrary();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.replace("/");
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setEmail(session.user.email ?? null);
        await refreshBooks();
      }
    });

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function deleteBook(bookId: string) {
    try {
      // Delete reading progress first (to avoid foreign key constraints)
      const { error: progressError } = await supabase
        .from("reading_progress")
        .delete()
        .eq("book_id", bookId);
      
      if (progressError) {
        console.error("Error deleting reading progress:", progressError);
        // Continue with book deletion even if progress deletion fails
      }
      
      // Delete the book from database
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", bookId);
      
      if (error) {
        console.error("Error deleting book:", error);
        return;
      }
      
      // Refresh the book list
      await refreshBooks();
    } catch (error) {
      console.error("Error in deleteBook:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] animate-fade-in">
        <Card className="w-full max-w-md shadow-xl border-muted">
          <CardContent className="p-16 text-center">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            </div>
            <p className="text-lg text-muted-foreground font-medium">{loadingMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <Card className="w-full max-w-md mx-auto shadow-xl border-muted">
          <CardContent className="p-16 text-center space-y-6">
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20">
                <BookOpen className="h-16 w-16 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold">Sign in required</h1>
              <p className="text-muted-foreground">Please sign in to view your library</p>
            </div>
            <Button 
              onClick={() => router.push("/sign-in")} 
              size="lg"
              className="h-11 px-8 shadow-lg hover:shadow-xl smooth-transition"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">My Library</h1>
        <p className="text-lg text-muted-foreground">Manage and read your digital book collection</p>
      </div>
      
      <UploadForm onUploaded={refreshBooks} />
      
      <BookList books={books} onDeleteBook={deleteBook} />
    </div>
  );
}

function BookList({ books, onDeleteBook }: { books: BookRow[]; onDeleteBook: (id: string) => void }) {
  if (!books.length) {
    return (
      <Card className="border-dashed border-2 animate-fade-in-up animation-delay-200">
        <CardContent className="p-16 text-center">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl"></div>
            <div className="relative bg-muted p-6 rounded-full">
              <BookOpen className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Upload a PDF to get started with your digital library. EPUB support coming soon!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
      {books.map((b, index) => (
        <Card 
          key={b.id} 
          className="group hover:shadow-2xl smooth-transition hover:-translate-y-2 border-muted hover:border-primary/20 animate-scale-in" 
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-0">
            <div className="aspect-[2/3] bg-gradient-to-br from-muted to-muted/50 rounded-t-lg relative overflow-hidden">
              <Link href={`/read/${b.id}`} className="block w-full h-full cursor-pointer">
                {b.cover_url ? (
                  <img 
                    src={b.cover_url} 
                    alt={b.title ?? "Book cover"}
                    className="w-full h-full object-cover group-hover:scale-105 smooth-transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                    {b.format === 'pdf' ? (
                      <FileText className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 smooth-transition" strokeWidth={1.5} />
                    ) : (
                      <FileImage className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 smooth-transition" strokeWidth={1.5} />
                    )}
                  </div>
                )}
                
                {/* Overlay gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
              </Link>
              
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 text-[10px] sm:text-xs backdrop-blur-sm bg-background/80 border-0 shadow-lg"
              >
                {b.format?.toUpperCase()}
              </Badge>
              
              {/* Delete button */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 smooth-transition">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 cursor-pointer shadow-lg hover:shadow-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Book</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{b.title ?? "Untitled"}&quot;? 
                        This action cannot be undone and will remove the book from your library.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteBook(b.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              <Link href={`/read/${b.id}`} className="block cursor-pointer space-y-1">
                <h3 className="font-semibold truncate text-sm group-hover:text-primary smooth-transition">
                  {b.title ?? "Untitled"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {b.author ?? "Unknown Author"}
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputId = "file-input";

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || ext !== "pdf") throw new Error("Only PDF files are supported. EPUB support coming soon!");
      const path = `${crypto.randomUUID()}.${ext}`;
      await uploadToBucket({ bucket: "books", file, path });
      const fileUrl = getPublicUrl("books", path);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await supabase.from("books").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        author: null,
        format: "pdf",
        file_url: fileUrl,
        size_bytes: file.size,
      });
      setFile(null);
      onUploaded();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [file, onUploaded]);

  return (
    <Card className="border-muted shadow-lg animate-fade-in-up">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <span>Upload a Book</span>
        </CardTitle>
        <CardDescription className="text-base">
          Add PDF files to your library. EPUB support coming soon!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor={fileInputId} className="text-sm font-medium">Choose file</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input 
                id={fileInputId} 
                type="file" 
                accept=".pdf,application/pdf" 
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => document.getElementById(fileInputId)?.click()}
                className="flex items-center gap-2 cursor-pointer h-11 border-2 border-dashed hover:border-primary smooth-transition hover:bg-primary/5"
              >
                <Upload className="h-4 w-4" />
                <span className="font-medium">Choose file</span>
              </Button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {file ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive ml-auto flex-shrink-0"
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file selected</span>
                )}
              </div>
            </div>
          </div>
          <Button 
            disabled={!file || busy} 
            type="submit" 
            className="w-full cursor-pointer h-11 text-base font-medium shadow-lg hover:shadow-xl smooth-transition"
          >
            {busy ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload Book
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}



