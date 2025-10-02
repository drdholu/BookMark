export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "BookMark",
  NEXT_PUBLIC_APP_DESCRIPTION:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Read your books on web and PWA with sync",
};

export function assertPublicEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // We avoid throwing at build to not block local iteration; UI can warn instead
    // eslint-disable-next-line no-console
    console.warn("Missing Supabase public env. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}



