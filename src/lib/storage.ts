import { supabase } from "@/lib/supabase";

export async function uploadToBucket(opts: {
  bucket: string;
  file: File;
  path: string;
}) {
  const { bucket, file, path } = opts;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return data;
}

export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}


