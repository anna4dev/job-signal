import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/bookmarks", "/profile"],
      },
      {
        // Explicit group replaces "*"; must repeat private-route disallows.
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot"],
        allow: "/",
        disallow: ["/api/", "/bookmarks", "/profile"],
      },
    ],
    sitemap: "https://jobsignal.dev/sitemap.xml",
  };
}
