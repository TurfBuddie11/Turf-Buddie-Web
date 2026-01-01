import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://turfbuddie.com";

  const staticRoutes = ["", "about", "tournaments", "explore"];
  const dynamicRoutes = ["turfs"]; // Add dynamic slugs if needed

  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  return allRoutes.map((route) => ({
    url: `${baseUrl}/${route}`,
    lastModified: new Date().toISOString(),
  }));
}
