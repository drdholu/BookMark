"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { uploadToBucket, getPublicUrl } from "@/lib/storage";
import { useCallback } from "react";
import { BookRow } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);

  async function refreshBooks() {
    try {
      console.log("🔄 Fetching books from database...");
      
      // Add timeout to detect hanging queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database query timeout after 10 seconds")), 10000)
      );
      
      const queryPromise = supabase
        .from("books")
        .select("*")
        .order("uploaded_at", { ascending: false });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error("❌ Supabase error:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        return;
      }
      
      console.log("📖 Books fetched:", data?.length || 0, "books");
      console.log("📖 Raw data:", data);
      setBooks(data as unknown as BookRow[]);
    } catch (error) {
      console.error("❌ Error in refreshBooks:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    let active = true;
    
    const loadLibrary = async () => {
      try {
        console.log("🔍 Starting library load...");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        console.log("👤 User data:", user ? "Found user" : "No user");
        
        if (!active) return;
        
        if (!user) {
          console.log("❌ No user, redirecting to home");
          router.replace("/");
          return;
        }
        
        console.log("📧 Setting email:", user.email);
        setEmail(user.email ?? null);
        
        console.log("📚 Refreshing books...");
        await refreshBooks();
        
        console.log("✅ Library load complete, setting loading to false");
        setLoading(false);
      } catch (error) {
        console.error("❌ Error loading library:", error);
        if (active) {
          setLoading(false);
        }
      }
    };

    // Add a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.log("⚠️ Safety timeout reached, forcing loading to false");
      if (active) {
        setLoading(false);
      }
    }, 15000); // 15 second safety timeout

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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!email) {
    return (
      <div className="p-6 space-y-4">
        <p>You need to sign in to view your library.</p>
        <Link className="underline" href="/sign-in">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Library</h1>
        <button
          className="border rounded px-3 py-1"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
      </div>
      <p className="opacity-70">Signed in as {email}</p>
      <UploadForm onUploaded={async () => {
        await refreshBooks();
      }} />
      <BookList books={books} />
    </div>
  );
}

function BookList({ books }: { books: BookRow[] }) {
  if (!books.length) {
    return <div className="rounded border p-4 text-sm opacity-80">No books yet. Upload an EPUB or PDF.</div>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {books.map((b) => (
        <a key={b.id} href={`/read/${b.id}`} className="border rounded p-3 block hover:bg-accent">
          <div className="aspect-[3/4] bg-muted mb-3 rounded" style={{ backgroundImage: b.cover_url ? `url(${b.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="font-medium truncate">{b.title ?? "Untitled"}</div>
          <div className="text-sm opacity-70 truncate">{b.author ?? "Unknown"}</div>
        </a>
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
      if (!ext || !["epub","pdf"].includes(ext)) throw new Error("Only EPUB or PDF allowed");
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
        format: ext === "epub" ? "epub" : "pdf",
        file_url: fileUrl,
        size_bytes: file.size,
      });
      setFile(null);
      onUploaded();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [file, onUploaded]);

  return (
    <form onSubmit={handleSubmit} className="border rounded p-4 space-y-3">
      <div className="font-medium">Upload a book</div>
      <div className="flex items-center gap-3">
        <input id={fileInputId} className="hidden" type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" className="border rounded px-3 py-1" onClick={() => document.getElementById(fileInputId)?.click()}>
          Choose file
        </button>
        <span className="text-sm opacity-80 truncate max-w-[50%]">{file?.name ?? "No file selected"}</span>
        <button disabled={!file || busy} className="border rounded px-3 py-1 ml-auto" type="submit">{busy ? "Uploading..." : "Upload"}</button>
      </div>
    </form>
  );
}



