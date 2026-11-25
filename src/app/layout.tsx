import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import Script from "next/script";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  fallback: ["ui-monospace", "Cascadia Mono", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "GGCB Alumni Portal",
    template: "%s — GGCB Alumni Portal",
  },
  description:
    "Alumni portal for Government Postgraduate College Burewala (GGCB).",
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Pre-paint theme apply — beforeInteractive hoists into <head> and
            runs before hydration without a raw <script> in the React tree
            (the dev-mode warning raw tags trigger). */}
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {
            "try{var t=localStorage.getItem('ggcb-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}"
          }
        </Script>
        {children}
        {children}
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
