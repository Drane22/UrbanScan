/** The owner-confirmed production origin. Override for a different deployment. */
export const PUBLIC_SITE_ORIGIN = "https://urbanscan-omega.vercel.app";
export const SITE_TITLE = "UrbanScan — QR codes with a world of their own";
export const SITE_DESCRIPTION =
  "Create a scannable QR code from a link, explore 15 procedural 3D worlds, and download a crisp PNG or SVG. QR generation works without WebGPU.";

export function createSiteMetadata(origin = PUBLIC_SITE_ORIGIN) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_ORIGIN must be a public HTTPS origin without a path, credentials or query.",
    );
  const canonical = url.origin + "/";
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    canonical,
    image: new URL("og-image.png", canonical).href,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "UrbanScan",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web browser",
      description: SITE_DESCRIPTION,
      url: canonical,
    },
    robots: `User-agent: *\nAllow: /\nSitemap: ${canonical}sitemap.xml\n`,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${canonical}</loc></url></urlset>\n`,
  };
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export function renderSiteMetadata(origin?: string): string {
  const site = createSiteMetadata(origin);
  return [
    `<title>${escape(site.title)}</title>`,
    `<meta name="description" content="${escape(site.description)}">`,
    `<link rel="canonical" href="${escape(site.canonical)}">`,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="UrbanScan">',
    `<meta property="og:title" content="${escape(site.title)}">`,
    `<meta property="og:description" content="${escape(site.description)}">`,
    `<meta property="og:url" content="${escape(site.canonical)}">`,
    `<meta property="og:image" content="${escape(site.image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Waves, Crystalline and Mechanical worlds beside a scannable QR code">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escape(site.title)}">`,
    `<meta name="twitter:description" content="${escape(site.description)}">`,
    `<meta name="twitter:image" content="${escape(site.image)}">`,
    `<script type="application/ld+json">${JSON.stringify(site.structuredData).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
}
