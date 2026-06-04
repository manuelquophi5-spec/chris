import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/PwaProvider";
import { APP_NAME, APP_TITLE, LOGO_SRC } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_TITLE,
  description:
    "Mobile-first geofenced attendance for Data Link Institute — verify check-ins with GPS.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: LOGO_SRC, sizes: "any", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: LOGO_SRC, sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#6B2D3E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-[100dvh] flex flex-col font-sans antialiased">
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
