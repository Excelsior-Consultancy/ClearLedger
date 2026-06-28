export function withQuarterQuery(href: string, quarterId?: string | null) {
  if (!quarterId) {
    return href;
  }

  try {
    const url = new URL(href, "http://localhost");
    url.searchParams.set("quarterId", quarterId);
    const path = `${url.pathname}${url.search}${url.hash}`;
    return href.startsWith("http://") || href.startsWith("https://") ? url.toString() : path;
  } catch {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}quarterId=${encodeURIComponent(quarterId)}`;
  }
}
