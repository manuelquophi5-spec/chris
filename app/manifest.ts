import type { MetadataRoute } from "next";
import { BRAND_CREAM, BRAND_WINE } from "@/lib/brand";
import { getSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName, logoUrl } = await getSettings();

  return {
    id: "/",
    name: appName,
    short_name: appName,
    description:
      "Check in at campus with your phone — GPS confirms you are on site.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: BRAND_CREAM,
    theme_color: BRAND_WINE,
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons: [
      {
        src: logoUrl,
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
