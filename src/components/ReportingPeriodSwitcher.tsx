"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Chip } from "@heroui/react";

type QuarterOption = {
  id?: string;
  label: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  active: boolean;
  financialYear: string;
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

  for (const quarter of quarters) {
    const items = groups.get(quarter.financialYear) ?? [];
    items.push(quarter);
    groups.set(quarter.financialYear, items);
  }

  return Array.from(groups.entries())
    .map(([value, items]) => ({
      value,
      label: value,
      quarters: items.sort((left, right) => right.startDate.localeCompare(left.startDate))
    }))
    .sort((left, right) => right.value.localeCompare(left.value));
}

function buildHref(pathname: string, searchParams: URLSearchParams, quarterId: string) {
  searchParams.set("quarterId", quarterId);
  return `${pathname}?${searchParams.toString()}`;
}

export function ReportingPeriodSwitcher({
  quarters,
  selectedQuarterId,
  className
}: ReportingPeriodSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupedYears = useMemo(() => buildFinancialYears(quarters), [quarters]);
  const selectedQuarter = quarters.find((quarter) => quarter.id === selectedQuarterId) ?? quarters[0];
  const selectedFinancialYear =
    groupedYears.find((group) => group.quarters.some((quarter) => quarter.id === selectedQuarterId))?.value ??
    groupedYears[0]?.value ??
    "";
  const visibleQuarters = groupedYears.find((group) => group.value === selectedFinancialYear)?.quarters ?? quarters;

  function navigateToQuarter(quarterId: string) {
    const params = new URLSearchParams(searchParams.toString());
    window.location.assign(buildHref(pathname, params, quarterId));
  }

  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm ${className ?? ""}`.trim()}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-zinc-400">Financial year</label>
          <select
            value={selectedFinancialYear}
          onChange={(event) => {
            const nextYear = event.target.value;
            const nextGroup = groupedYears.find((group) => group.value === nextYear);
            const nextQuarter = nextGroup?.quarters[0];
            const nextQuarterId = nextQuarter?.id ?? nextQuarter?.startDate;
            if (nextQuarterId) {
              navigateToQuarter(nextQuarterId);
            }
          }}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            aria-label="Financial year"
            data-testid="financial-year-select"
          >
            {groupedYears.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-zinc-400">Quarter</label>
          <select
            value={selectedQuarter?.id ?? selectedQuarterId}
            onChange={(event) => navigateToQuarter(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            aria-label="Quarter"
            data-testid="quarter-select"
          >
            {visibleQuarters.map((quarter) => (
              <option key={quarter.id ?? quarter.startDate} value={quarter.id ?? quarter.startDate}>
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
