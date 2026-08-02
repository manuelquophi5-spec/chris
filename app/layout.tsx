import type { Metadata, Viewport } from "next";
import { BrandProvider } from "@/components/BrandProvider";
import { PwaProvider } from "@/components/PwaProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { getSettings } from "@/lib/settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { appName, logoUrl } = await getSettings();
  return {
    title: appName,
    description:
      "Mobile-first geofenced attendance — verify check-ins with GPS.",
    applicationName: appName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    icons: {
      icon: [
        { url: logoUrl, sizes: "any" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: logoUrl, sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#6B2D3E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { appName, logoUrl } = await getSettings();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-[100dvh] flex flex-col font-sans antialiased">
        <BrandProvider appName={appName} logoUrl={logoUrl}>
          {children}
          <ToastProvider />
          <PwaProvider />
        </BrandProvider>
      </body>
    </html>
  );
}
