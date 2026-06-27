"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { MembershipRole } from "@prisma/client";
import { selectWorkspaceAction, signOutAction } from "@/app/auth/actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payroll", label: "Payroll Lite", badge: "MVP" },
  { href: "/bas", label: "BAS" },
  { href: "/ca-pack", label: "CA Pack" },
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
  const [isPending, startTransition] = useTransition();

  return (
    <aside className="w-56 min-h-screen bg-[#111827] text-[#e5e7eb] flex flex-col p-4 shrink-0">
      <div className="mb-5 px-1">
        <p className="text-white font-bold text-lg">ClearLedger</p>
        <p className="text-xs text-[#94a3b8] mt-1">{userName} · {roleLabel(currentRole)}</p>
      </div>

      {memberships.length > 1 && (
        <form action={selectWorkspaceAction} className="mb-4">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[#94a3b8] mb-2">Company</label>
          <select
            name="workspaceId"
            defaultValue={selectedWorkspaceId}
            className="w-full rounded-md bg-[#0f172a] border border-[#334155] px-3 py-2 text-sm text-white"
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
      )}

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, badge }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex justify-between items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
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

      <form action={signOutAction} className="mt-auto pt-4">
        <button
          type="submit"
          className="w-full text-left text-sm text-[#cbd5e1] hover:bg-[#1f2937]/60 hover:text-white px-3 py-2.5 rounded-md transition-colors"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
