export const dynamic = "force-static";

export default function sitemap() {
  const routes = ["", "/privacy", "/terms", "/license", "/disclaimer"];
  return routes.map((route) => ({
    url: `https://racera.online${route}`,
    lastModified: new Date(),
    changeFrequency: route ? "yearly" : "monthly",
    priority: route ? 0.3 : 1,
  }));
}
