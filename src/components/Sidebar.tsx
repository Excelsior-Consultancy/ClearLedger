"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MembershipRole } from "@prisma/client";
import { Button } from "@heroui/react";
import { selectWorkspaceAction, signOutAction } from "@/app/auth/actions";
import { withQuarterQuery } from "@/modules/quarters/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payroll", label: "Payroll Lite", badge: "MVP" },
  { href: "/admin/setup", label: "Admin" },
  { href: "/admin/users", label: "Users" },
];

type SidebarProps = {
  currentRole: MembershipRole | null;
  userName: string;
  memberships: { workspaceId: string; workspace: { id: string; name: string }; role: MembershipRole }[];
  selectedWorkspaceId: string;
};

function roleLabel(role: MembershipRole | null) {
  if (!role) return "Not signed in";
  return role[0] + role.slice(1).toLowerCase();
}

export function Sidebar({ currentRole, userName, memberships, selectedWorkspaceId }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quarterId = searchParams.get("quarterId");
  const [isPending, startTransition] = useTransition();
  const withSelection = (href: string) => withQuarterQuery(href, quarterId);

  return (
    <aside className="shrink-0 border-b border-[#1f2937] bg-[#111827] px-4 py-4 text-[#e5e7eb] lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-56 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-start justify-between gap-3 lg:block lg:px-1">
        <div>
          <p className="text-base font-bold text-white sm:text-lg">ClearLedger</p>
          <p className="mt-1 text-xs text-[#94a3b8]">
            {userName} · {roleLabel(currentRole)}
          </p>
        </div>
      </div>

      <form action={selectWorkspaceAction} className="mb-4">
        <label className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-[#94a3b8]">Company</label>
        <input type="hidden" name="quarterId" value={quarterId ?? ""} />
        <select
          name="workspaceId"
          defaultValue={selectedWorkspaceId}
          className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white"
          onChange={(event) => {
            startTransition(() => {
              event.currentTarget.form?.requestSubmit();
            });
          }}
        >
          {memberships.map((membership) => (
            <option key={membership.workspaceId} value={membership.workspaceId}>
              {membership.workspace.name}
            </option>
          ))}
        </select>
        <button type="submit" className="sr-only" disabled={isPending}>
          Switch company
        </button>
      </form>

      <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-col lg:gap-0.5">
        {NAV_ITEMS.map(({ href, label, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={withSelection(href)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors sm:text-sm ${
                isActive
                  ? "bg-[#1f2937] text-white"
                  : "text-[#cbd5e1] hover:bg-[#1f2937]/60 hover:text-white"
              }`}
            >
              <span>{label}</span>
              {badge && (
                <span className="text-[11px] text-[#94a3b8]">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="mt-4 pt-2 lg:mt-auto lg:pt-4">
        <Button
          type="submit"
          variant="ghost"
          className="w-full rounded-md px-3 py-2.5 text-left text-sm text-[#cbd5e1] transition-colors hover:bg-[#1f2937]/60 hover:text-white"
        >
          Sign out
        </Button>
      </form>
    </aside>
  );
}
