import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "BookMarked",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Read your books on web and PWA with sync",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable} ${literata.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <ServiceWorkerProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {children}
              </main>
            </div>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
