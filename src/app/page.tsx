import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/modules/auth/service";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { Button, Card, CardContent, Chip } from "@heroui/react";

const FEATURES = [
  {
    title: "GST validation",
    description: "Every invoice and expense is checked for GST correctness the moment it's entered."
  },
  {
    title: "BAS quarter reporting",
    description: "See lodgement status for the current quarter and what's still outstanding."
  },
  {
    title: "CA Pack export",
    description: "A single Excel export your accountant can lodge from, with every figure traceable."
  },
  {
    title: "Payroll Lite",
    description: "Run pay for a small team without a full payroll platform to configure."
  }
] as const;

const CHART_BARS = [38, 52, 44, 68, 58, 82, 71, 94] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: { searchParams?: SearchParams }) {
  const auth = await getAuthContext();
  if (auth?.currentMembership) {
    const params = searchParams ? await searchParams : {};
    redirect(withQuarterQuery("/dashboard", single(params.quarterId)));
  }

  return (
    <div className="bg-[#fafaf9]">
      <div className="bg-[radial-gradient(circle_at_18%_0%,_#16352c,_#0c1a22_42%,_#060c12_100%)]">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-400 text-xs font-extrabold text-emerald-950">
              C
            </span>
            ClearLedger
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary">Sign up</Button>
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
              Built for Australian BAS
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl">
              Bookkeeping that keeps you <span className="text-emerald-300">BAS-ready</span> every quarter.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
              Track income and expenses, validate GST as you go, and hand your accountant a finished
              CA Pack — without the pre-lodgement scramble.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button variant="primary" className="px-6 py-2.5">
                  Sign up free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="px-6 py-2.5 text-white hover:bg-white/10">
                  Log in
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Google sign-in for now · more sign-in methods coming soon
            </p>
          </div>

          <Card className="rotate-[-0.6deg] border-0 bg-white shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-zinc-900">This quarter</p>
                <p className="text-xs text-zinc-400">Jul – Sep 2026</p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Income</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$48,210</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Expenses</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$19,860</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">GST payable</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$2,835</p>
                </div>
              </div>

              <div className="mt-4 flex h-14 items-end gap-1.5">
                {CHART_BARS.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-b from-emerald-300 to-emerald-700"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Chip color="success" variant="soft" size="sm">
                  BAS ready
                </Chip>
                <Chip color="warning" variant="soft" size="sm">
                  2 receipts missing
                </Chip>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Everything BAS touches
        </p>
        <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight text-zinc-900">
          One place for income, expenses, GST, and payroll — built around your quarterly lodgement.
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-semibold text-zinc-900">{feature.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl items-center justify-between border-t border-zinc-200 px-6 py-6 text-xs text-zinc-400 sm:px-8">
        <span>© 2026 ClearLedger</span>
        <span>Sydney, Australia</span>
      </div>
    </div>
  );
}
