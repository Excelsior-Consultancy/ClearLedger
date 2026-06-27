export type ReportingQuarter = {
  label: string;
  startDate: string;
  endDate: string;
  locked: boolean;
};

export type ReportingQuarterConfig = Omit<ReportingQuarter, "locked">;

export const currentReportingQuarter: ReportingQuarterConfig = {
  label: "Q4 FY2025-26",
  startDate: "2026-04-01",
  endDate: "2026-06-30"
};

export const currentExpenseQuarter = currentReportingQuarter;

export function withQuarterLock(locked: boolean): ReportingQuarter {
  return {
    ...currentReportingQuarter,
    locked
  };
}
