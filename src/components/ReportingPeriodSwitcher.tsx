"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Chip } from "@heroui/react";
import { formatFinancialYear } from "@/modules/shared/quarter";

type QuarterOption = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  active: boolean;
};

type ReportingPeriodSwitcherProps = {
  quarters: QuarterOption[];
  selectedQuarterId: string;
  className?: string;
};

type FinancialYearOption = {
  value: string;
  label: string;
  quarters: QuarterOption[];
};

function buildFinancialYears(quarters: QuarterOption[]): FinancialYearOption[] {
  const groups = new Map<string, QuarterOption[]>();

  quarters.forEach((quarter) => {
    const fiscalYear = formatFinancialYear(new Date(`${quarter.startDate}T00:00:00.000Z`));
    const list = groups.get(fiscalYear) ?? [];
    list.push(quarter);
    groups.set(fiscalYear, list);
  });

  return Array.from(groups.entries())
    .map(([value, items]) => ({
      value,
      label: value,
      quarters: items.sort((left, right) => right.startDate.localeCompare(left.startDate))
    }))
    .sort((left, right) => right.value.localeCompare(left.value));
}

function updateQuery(pathname: string, searchParams: URLSearchParams, quarterId: string) {
  searchParams.set("quarterId", quarterId);
  return `${pathname}?${searchParams.toString()}`;
}

export function ReportingPeriodSwitcher({
  quarters,
  selectedQuarterId,
  className
}: ReportingPeriodSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupedYears = useMemo(() => buildFinancialYears(quarters), [quarters]);
  const selectedQuarter = quarters.find((quarter) => quarter.id === selectedQuarterId) ?? quarters[0];
  const selectedFinancialYear =
    groupedYears.find((group) => group.quarters.some((quarter) => quarter.id === selectedQuarterId))?.value ??
    groupedYears[0]?.value ??
    "";

  const activeYear = groupedYears.find((group) => group.value === selectedFinancialYear) ?? groupedYears[0];
  const visibleQuarters = activeYear?.quarters ?? quarters;

  function navigateToQuarter(quarterId: string) {
    const params = new URLSearchParams(searchParams.toString());
    router.replace(updateQuery(pathname, params, quarterId));
    router.refresh();
  }

  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm ${className ?? ""}`.trim()}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px]">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-400 mb-1">Financial year</label>
          <select
            value={selectedFinancialYear}
            onChange={(event) => {
              const nextYear = event.target.value;
              const nextGroup = groupedYears.find((group) => group.value === nextYear);
              const nextQuarter = nextGroup?.quarters[0];
              if (nextQuarter) {
                navigateToQuarter(nextQuarter.id);
              }
            }}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          >
            {groupedYears.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-400 mb-1">Quarter</label>
          <select
            value={selectedQuarter?.id}
            onChange={(event) => navigateToQuarter(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          >
            {visibleQuarters.map((quarter) => (
              <option key={quarter.id} value={quarter.id}>
                {quarter.label} {quarter.locked ? "(Locked)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto">
          <Chip color={selectedQuarter?.locked ? "success" : "warning"} variant="soft" size="sm">
            {selectedQuarter?.label ?? "Quarter"}
          </Chip>
        </div>
      </div>
    </div>
  );
}
