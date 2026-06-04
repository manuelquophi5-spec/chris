import type { MetadataRoute } from "next";
import { APP_NAME, APP_TITLE, BRAND_CREAM, BRAND_WINE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_TITLE,
    short_name: APP_NAME,
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
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
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
