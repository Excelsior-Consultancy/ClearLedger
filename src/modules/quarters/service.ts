import { prisma } from "@/modules/db/prisma";
import { getWorkspaceAccess } from "@/modules/auth/service";
import {
  buildQuarterFromDates,
  buildQuarterTimeline,
  currentReportingQuarter,
  formatFinancialYear,
  parseIsoDate,
  quarterDateRange,
  type ReportingQuarter
} from "@/modules/shared/quarter";

type QuarterRow = ReportingQuarter & {
  active: boolean;
  financialYear: string;
};

export type WorkspaceQuarterContext = {
  workspaceId: string;
  workspaceName: string;
  fiscalYearStartMonth: number;
  currentQuarterId: string;
  currentQuarter: ReportingQuarter;
  selectedQuarterId: string;
  selectedQuarter: QuarterRow;
  quarters: QuarterRow[];
};

function compareDateFields(left: Date | null | undefined, right: Date | null | undefined) {
  if (!left) return right ?? null;
  if (!right) return left;
  return left < right ? left : right;
}

function compareDateFieldsMax(left: Date | null | undefined, right: Date | null | undefined) {
  if (!left) return right ?? null;
  if (!right) return left;
  return left > right ? left : right;
}

async function getWorkspaceDateBounds(workspaceId: string) {
  const [workspace, expenseBounds, invoiceBounds, payrollBounds] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, financialYearStartMonth: true }
    }),
    prisma.expense.aggregate({
      where: { workspaceId },
      _min: { date: true },
      _max: { date: true }
    }),
    prisma.invoice.aggregate({
      where: { workspaceId },
      _min: { issueDate: true },
      _max: { issueDate: true }
    }),
    prisma.payRun.aggregate({
      where: { workspaceId },
      _min: { periodStart: true },
      _max: { periodStart: true }
    })
  ]);

  if (!workspace) {
    throw new Error("Company not found.");
  }

  const minDate = compareDateFields(
    compareDateFields(expenseBounds._min.date, invoiceBounds._min.issueDate),
    payrollBounds._min.periodStart
  );
  const maxDate = compareDateFieldsMax(
    compareDateFieldsMax(expenseBounds._max.date, invoiceBounds._max.issueDate),
    payrollBounds._max.periodStart
  );

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    fiscalYearStartMonth: workspace.financialYearStartMonth ?? 7,
    minDate,
    maxDate
  };
}

function makeCurrentQuarter(fiscalYearStartMonth: number) {
  const startDate = parseIsoDate(currentReportingQuarter.startDate);
  const endDate = parseIsoDate(currentReportingQuarter.endDate);
  if (!startDate || !endDate) {
    throw new Error("Default reporting quarter configuration is invalid.");
  }

  return buildQuarterFromDates(startDate, endDate, false, fiscalYearStartMonth);
}

function toQuarterRow(
  quarter: ReportingQuarter,
  selectedQuarterId: string,
  fiscalYearStartMonth: number
): QuarterRow {
  const startDate = parseIsoDate(quarter.startDate);
  if (!startDate) {
    throw new Error("Quarter start date is invalid.");
  }

  return {
    ...quarter,
    id: quarter.id ?? quarter.startDate,
    active: (quarter.id ?? quarter.startDate) === selectedQuarterId,
    financialYear: formatFinancialYear(startDate, fiscalYearStartMonth)
  };
}

function chooseSelectedQuarter(quarters: QuarterRow[], quarterId?: string) {
  if (quarterId) {
    const selected = quarters.find((quarter) => quarter.id === quarterId);
    if (selected) {
      return selected;
    }
  }

  const today = new Date();
  const todayQuarter = quarters.find((quarter) => {
    const range = quarterDateRange(quarter);
    return today >= range.start && today < range.exclusiveEnd;
  });

  return todayQuarter ?? quarters[0];
}

export async function getWorkspaceQuarterContext(workspaceId: string, quarterId?: string): Promise<WorkspaceQuarterContext> {
  const { workspaceId: id, workspaceName, fiscalYearStartMonth, minDate, maxDate } = await getWorkspaceDateBounds(workspaceId);
  const baseQuarter = makeCurrentQuarter(fiscalYearStartMonth);

  const timeline = minDate && maxDate
    ? buildQuarterTimeline(minDate, maxDate, fiscalYearStartMonth)
    : [baseQuarter];

  const quarters = timeline.length > 0
    ? timeline
        .map((quarter) => toQuarterRow(quarter, "", fiscalYearStartMonth))
        .sort((left, right) => right.startDate.localeCompare(left.startDate))
    : [toQuarterRow(baseQuarter, "", fiscalYearStartMonth)];

  const currentQuarter = chooseSelectedQuarter(quarters, undefined);
  const selectedQuarter = chooseSelectedQuarter(quarters, quarterId) ?? currentQuarter;
  const selectedQuarterId = selectedQuarter.id ?? selectedQuarter.startDate;
  const currentQuarterId = currentQuarter.id ?? currentQuarter.startDate;

  return {
    workspaceId: id,
    workspaceName,
    fiscalYearStartMonth,
    currentQuarterId,
    currentQuarter: {
      id: currentQuarter.id,
      label: currentQuarter.label,
      startDate: currentQuarter.startDate,
      endDate: currentQuarter.endDate,
      locked: currentQuarter.locked
    },
    selectedQuarterId,
    selectedQuarter,
    quarters: quarters.map((quarter) => ({
      ...quarter,
      active: quarter.id === selectedQuarterId
    }))
  };
}

export async function resolveWorkspaceQuarter(workspaceId: string, quarterId?: string) {
  const context = await getWorkspaceQuarterContext(workspaceId, quarterId);
  const selectedQuarter = context.quarters.find((quarter) => quarter.id === context.selectedQuarterId) ?? context.selectedQuarter;

  return {
    context,
    selectedQuarter
  };
}

export async function getCurrentWorkspaceQuarter(workspaceId: string) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  return context.currentQuarter;
}

export async function listWorkspaceQuarters(workspaceId: string) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  return context.quarters;
}

export async function getWorkspaceQuarterForCurrentUser(quarterId?: string) {
  const access = await getWorkspaceAccess();
  return resolveWorkspaceQuarter(access.workspaceId, quarterId);
}
