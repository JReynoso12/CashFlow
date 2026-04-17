import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CashFlow — Personal Finance",
    short_name: "CashFlow",
    description: "Track, manage, and grow your finances",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c0f0e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
