import type { MetadataRoute } from "next";

import { source } from "@/lib/source";

/** Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin (no trailing slash). */
function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  }
  return url.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();

  const entries: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const page of source.getPages()) {
    entries.push({
      url: `${origin}${page.url}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
