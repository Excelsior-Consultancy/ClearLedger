export function resolveAppOrigin() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

export function resolveRequestOrigin(input: {
  headers: Pick<Headers, "get">;
}) {
  const origin = input.headers.get("origin")?.trim();
  if (origin) {
    return origin;
  }

  const host = input.headers.get("x-forwarded-host")?.trim() || input.headers.get("host")?.trim();
  if (host) {
    const protocol = input.headers.get("x-forwarded-proto")?.trim() || "http";
    return `${protocol}://${host}`;
  }

  return resolveAppOrigin();
}
