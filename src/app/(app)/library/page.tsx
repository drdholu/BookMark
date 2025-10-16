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
      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-6"></div>
            <p className="text-muted-foreground text-base">{loadingMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="text-center py-16">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardContent className="p-16 text-center">
            <BookOpen className="h-20 w-20 text-muted-foreground/60 mx-auto mb-6" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold mb-4">Please sign in to view your library</h1>
            <Button onClick={() => router.push("/sign-in")} size="lg" className="h-11 px-8 shadow-md">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">My Library</h1>
        <p className="text-lg text-muted-foreground">Manage your digital book collection</p>
      </div>
      
      <UploadForm onUploaded={refreshBooks} />
      
      <BookList books={books} onDeleteBook={deleteBook} />
    </div>
  );
}

function BookList({ books, onDeleteBook }: { books: BookRow[]; onDeleteBook: (id: string) => void }) {
  if (!books.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-16 text-center">
          <BookOpen className="h-20 w-20 text-muted-foreground/60 mx-auto mb-6" strokeWidth={1.5} />
          <h3 className="text-xl font-semibold mb-3">No books yet</h3>
          <p className="text-muted-foreground text-base">Upload a PDF to get started with your digital library.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      {books.map((b) => (
        <Card key={b.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-muted overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-[3/4] bg-gradient-to-br from-muted to-muted/50 rounded-t-lg relative overflow-hidden">
              <Link href={`/read/${b.id}`} className="block w-full h-full cursor-pointer">
                {b.cover_url ? (
                  <img 
                    src={b.cover_url} 
                    alt={b.title ?? "Book cover"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {b.format === 'pdf' ? (
                      <FileText className="h-14 w-14 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" strokeWidth={1.5} />
                    ) : (
                      <FileImage className="h-14 w-14 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" strokeWidth={1.5} />
                    )}
                  </div>
                )}
              </Link>
              <Badge 
                variant="secondary" 
                className="absolute top-2.5 right-2.5 text-[10px] sm:text-xs font-semibold shadow-sm"
              >
                {b.format?.toUpperCase()}
              </Badge>
              
              {/* Delete button */}
              <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 cursor-pointer shadow-lg"
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
              <Link href={`/read/${b.id}`} className="block cursor-pointer">
                <h3 className="font-semibold truncate text-sm sm:text-base mb-1.5 group-hover:text-primary transition-colors">
                  {b.title ?? "Untitled"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
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
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2.5 text-xl">
          <Upload className="h-5 w-5 text-primary" />
          <span>Upload a Book</span>
        </CardTitle>
        <CardDescription className="text-base">
          Upload PDF files to add them to your library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor={fileInputId} className="text-sm font-medium">Choose file</Label>
            <div className="flex items-center gap-3">
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
                size="default"
                onClick={() => document.getElementById(fileInputId)?.click()}
                className="flex items-center space-x-2 cursor-pointer h-10"
              >
                <Upload className="h-4 w-4" />
                <span>Choose file</span>
              </Button>
              <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                {file?.name ?? "No file selected"}
              </span>
            </div>
          </div>
          <Button 
            disabled={!file || busy} 
            type="submit" 
            size="lg"
            className="w-full cursor-pointer h-11 text-base shadow-md hover:shadow-lg transition-all"
          >
            {busy ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Book
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}



