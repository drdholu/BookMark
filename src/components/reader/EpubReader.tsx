"use client";

import { useEffect, useRef, useState } from "react";
import ePub, { Rendition, Book } from "epubjs";
import { supabase } from "@/lib/supabase";

interface Props {
  bookId: string;
  fileUrl: string;
}

export default function EpubReader({ bookId, fileUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [loading, setLoading] = useState(true);

  // Load last position
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("location_json")
        .eq("book_id", bookId)
        .single();
      const lastCfi = !error && data?.location_json?.cfi ? data.location_json.cfi : undefined;
      const book = ePub(fileUrl);
      bookRef.current = book;
      const rend = book.renderTo(containerRef.current as HTMLDivElement, {
        width: "100%",
        height: "100dvh",
      });
      setRendition(rend);
      await rend.display(lastCfi);
      setLoading(false);
      // Theme basics
      rend.themes.register("default", {
        body: {
          color: "inherit",
        },
      });
      rend.themes.select("default");
      // Save on location change (debounced by ePub.js)
      rend.on("relocated", async (loc: { start?: { cfi?: string } }) => {
        const cfi = loc?.start?.cfi;
        if (!cfi) return;
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;
        await supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            book_id: bookId,
            location_json: { cfi },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,book_id" }
        );
      });
    })();
  }, [bookId, fileUrl]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading EPUB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-background">
      <div className="flex gap-2 p-2 border-b bg-card sticky top-0 z-10">
        <button className="border rounded px-3 py-1" onClick={() => rendition?.prev()}>Prev</button>
        <button className="border rounded px-3 py-1" onClick={() => rendition?.next()}>Next</button>
      </div>
      <div ref={containerRef} className="w-full flex-1" />
    </div>
  );
}

