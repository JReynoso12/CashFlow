import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cashflow — Personal Finance",
    short_name: "Cashflow",
    description: "Track, manage, and grow your finances",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0f0e",
    theme_color: "#0c0f0e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
