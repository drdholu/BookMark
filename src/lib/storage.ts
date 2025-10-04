import { supabase } from "@/lib/supabase";
import { isValidPDF } from "./pdf-optimizer";

export async function uploadToBucket(opts: {
  bucket: string;
  file: File;
  path: string;
  optimizePDF?: boolean;
}) {
  const { bucket, file, path, optimizePDF = false } = opts;
  
  let fileToUpload = file;
  
  // PDF optimization is disabled for now due to implementation issues
  // TODO: Implement proper PDF optimization later
  if (optimizePDF && isValidPDF(file)) {
    console.log('PDF optimization is disabled - using original file');
    fileToUpload = file;
  }
  
  const { data, error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
    upsert: false,
  });
  if (error) throw error;
  return data;
}

export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}


