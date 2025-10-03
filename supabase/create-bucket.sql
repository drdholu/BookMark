-- Create storage buckets for the bookmark app
-- Run this in your Supabase SQL editor

-- Create the books bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'books',
  'books', 
  true,  -- Make it public so PDFs can be accessed directly
  52428800,  -- 50MB file size limit
  ARRAY['application/pdf', 'application/epub+zip']
);

-- Create the covers bucket (for book covers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,  -- Make it public
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
