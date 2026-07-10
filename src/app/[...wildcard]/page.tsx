import { notFound, redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const singleValue = single(value);
    if (typeof singleValue === "string" && singleValue.length > 0) {
      params.set(key, singleValue);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function WildcardAuthCallbackPage({
  params,
  searchParams
}: {
  params: Promise<{ wildcard?: string[] }>;
  searchParams?: SearchParams;
}) {
  const { wildcard = [] } = await params;
  const query: Record<string, string | string[] | undefined> = searchParams
    ? await searchParams
    : {};

  if (wildcard.length === 1 && wildcard[0] === "**" && single(query.code)) {
    redirect(`/auth/google/callback${normalizeSearchParams(query)}`);
  }

  notFound();
}
