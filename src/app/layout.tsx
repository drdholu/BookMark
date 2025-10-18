import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${instrumentSans.className} ${instrumentSans.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <ServiceWorkerProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-10">
                {children}
              </main>
            </div>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
