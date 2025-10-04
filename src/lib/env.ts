import { z } from "zod";

// Environment variable validation schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required").optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("BookMarked"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().default("Read your books on web and PWA with sync"),
});

// Validate environment variables
const parseResult = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
});

if (!parseResult.success) {
  console.error("❌ Environment validation failed:");
  parseResult.error.errors.forEach((error) => {
    console.error(`  - ${error.path.join(".")}: ${error.message}`);
  });
  // In development, we warn instead of throwing to not block iteration
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment configuration");
  }
}

export const env = parseResult.success ? parseResult.data : {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "BookMarked",
  NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Read your books on web and PWA with sync",
};

export function assertPublicEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Missing Supabase public env. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

// Security checks for environment variables
export function validateEnvironmentSecurity() {
  const warnings: string[] = [];
  
  // Check for development environment in production
  if (process.env.NODE_ENV === "production") {
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost") || 
        env.NEXT_PUBLIC_SUPABASE_URL.includes("127.0.0.1")) {
      warnings.push("⚠️  Using localhost Supabase URL in production");
    }
  }
  
  // Check for weak keys (basic validation)
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 20) {
    warnings.push("⚠️  Supabase anon key seems too short");
  }
  
  if (warnings.length > 0) {
    console.warn("Security warnings:");
    warnings.forEach(warning => console.warn(warning));
  }
  
  return warnings;
}


