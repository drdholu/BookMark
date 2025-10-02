export type BookFormat = "epub" | "pdf";

export interface BookRow {
  id: string;
  user_id: string;
  title: string | null;
  author: string | null;
  format: BookFormat;
  cover_url: string | null;
  file_url: string;
  size_bytes: number | null;
  uploaded_at: string;
  drm_flag: boolean;
}

export interface ReadingProgressRow {
  id: string;
  user_id: string;
  book_id: string;
  location_json: unknown;
  updated_at: string;
}

