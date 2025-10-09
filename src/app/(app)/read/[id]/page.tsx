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
        router.replace("/library");
        return;
      }
      setBook(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [params.id, router]);

  if (loading) {
    return null; // Let the individual readers handle their own loading states
  }

  if (book && book.format === "epub") {
    return <EpubReader bookId={book.id} fileUrl={book.file_url} />;
  }
  if (book) return <PdfReader bookId={book.id} fileUrl={book.file_url} />;
  return null;
}

