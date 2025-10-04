"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import EpubReader from "@/components/reader/EpubReader";
import PdfReader from "@/components/reader/PdfReader";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function ReadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<{ id: string; format: 'epub' | 'pdf'; file_url: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const { data, error } = await supabase
        .from("books")
        .select("id,format,file_url")
        .eq("id", params.id)
        .single();
      if (!active) return;
      if (error || !data) {
        console.error("Book not found:", error);
        router.replace("/library");
        return;
      }
      setBook(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    );
  }

  if (book && book.format === "epub") {
    return <EpubReader bookId={book.id} fileUrl={book.file_url} />;
  }
  if (book) return <PdfReader bookId={book.id} fileUrl={book.file_url} />;
  
  // Book not found - this should redirect to library, but just in case
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Book Not Found</h2>
            <p className="text-muted-foreground">
              The book you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <button
              onClick={() => router.push("/library")}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Library
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

