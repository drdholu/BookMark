-- RLS policies for reading_progress table
-- Run this in your Supabase SQL editor

-- Enable RLS on reading_progress table (if not already enabled)
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own reading progress
DROP POLICY IF EXISTS "Users can read own reading progress" ON public.reading_progress;
CREATE POLICY "Users can read own reading progress" ON public.reading_progress
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own reading progress
DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert own reading progress" ON public.reading_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own reading progress
DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update own reading progress" ON public.reading_progress
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own reading progress
DROP POLICY IF EXISTS "Users can delete own reading progress" ON public.reading_progress;
CREATE POLICY "Users can delete own reading progress" ON public.reading_progress
FOR DELETE USING (auth.uid() = user_id);

-- Also ensure books table has proper RLS policies
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own books
DROP POLICY IF EXISTS "Users can read own books" ON public.books;
CREATE POLICY "Users can read own books" ON public.books
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own books
DROP POLICY IF EXISTS "Users can insert own books" ON public.books;
CREATE POLICY "Users can insert own books" ON public.books
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own books
DROP POLICY IF EXISTS "Users can update own books" ON public.books;
CREATE POLICY "Users can update own books" ON public.books
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own books
DROP POLICY IF EXISTS "Users can delete own books" ON public.books;
CREATE POLICY "Users can delete own books" ON public.books
FOR DELETE USING (auth.uid() = user_id);
