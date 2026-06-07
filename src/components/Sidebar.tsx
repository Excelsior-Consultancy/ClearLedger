"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payroll", label: "Payroll Lite", badge: "MVP" },
  { href: "/bas", label: "BAS" },
  { href: "/ca-pack", label: "CA Pack" },
  { href: "/admin/setup", label: "Admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-[#111827] text-[#e5e7eb] flex flex-col p-4 shrink-0">
      <p className="text-white font-bold text-lg mb-5 px-1">ClearLedger</p>
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
    </aside>
  );
}
