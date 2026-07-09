import type { MetadataRoute } from "next";

// Internes Dashboard: komplett von Suchmaschinen ausschliessen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
