import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/ui";

export const metadata: Metadata = {
  title: "Wasl",
  description: "Wasl is an original social space for moments, stories, clips, and messages.",
  applicationName: "Wasl",
  manifest: "/manifest.json",
  icons: { icon: "/brand/mark.jpg" }
};

export const viewport: Viewport = {
  themeColor: "#1c5f59",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,680&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
