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

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addUtcMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function formatFinancialYear(startDate: Date, fiscalYearStartMonth = 7) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + 1;
  const fiscalYearStart = month >= fiscalYearStartMonth ? year : year - 1;
  const endYearSuffix = String(fiscalYearStart + 1).slice(-2);
  return `FY${fiscalYearStart}-${endYearSuffix}`;
}

export function formatQuarterLabel(startDate: Date, fiscalYearStartMonth = 7) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + 1;
  const offset = (month - fiscalYearStartMonth + 12) % 12;
  const quarterNumber = Math.floor(offset / 3) + 1;
  const fiscalYearStart = month >= fiscalYearStartMonth ? year : year - 1;
  const fiscalYearEndSuffix = String(fiscalYearStart + 1).slice(-2);
  return `Q${quarterNumber} FY${fiscalYearStart}-${fiscalYearEndSuffix}`;
}

export function buildQuarterFromDates(startDate: Date, endDate: Date, locked = false, fiscalYearStartMonth = 7): ReportingQuarter {
  return {
    label: formatQuarterLabel(startDate, fiscalYearStartMonth),
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    locked
  };
}

export function nextQuarterDates(startDate: Date) {
  const endDate = addUtcDays(addUtcMonths(startDate, 3), -1);
  return {
    startDate,
    endDate
  };
}
