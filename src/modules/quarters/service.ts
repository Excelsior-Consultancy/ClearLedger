import { prisma } from "@/modules/db/prisma";
import { getWorkspaceAccess } from "@/modules/auth/service";
import {
  addUtcDays,
  buildQuarterFromDates,
  currentReportingQuarter,
  nextQuarterDates,
  parseIsoDate,
  toIsoDate,
  type ReportingQuarter
} from "@/modules/shared/quarter";

export type WorkspaceQuarterRecord = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  active: boolean;
};

export type WorkspaceQuarterContext = {
  workspaceId: string;
  workspaceName: string;
  currentQuarterId: string;
  currentQuarter: ReportingQuarter;
  quarters: WorkspaceQuarterRecord[];
};

function toQuarter(record: {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  locked: boolean;
  workspaceId: string;
}): WorkspaceQuarterRecord {
  return {
    id: record.id,
    label: record.label,
    startDate: toIsoDate(record.startDate),
    endDate: toIsoDate(record.endDate),
    locked: record.locked,
    active: false
  };
}

async function ensureInitialQuarter(workspaceId: string) {
  const existing = await prisma.reportingQuarter.findFirst({
    where: { workspaceId },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
  });

  if (existing) {
    return existing;
  }

  const startDate = parseIsoDate(currentReportingQuarter.startDate);
  const endDate = parseIsoDate(currentReportingQuarter.endDate);
  if (!startDate || !endDate) {
    throw new Error("Default reporting quarter configuration is invalid.");
  }

  return prisma.reportingQuarter.create({
    data: {
      workspaceId,
      label: currentReportingQuarter.label,
      startDate,
      endDate,
      locked: false
    }
  });
}

export async function getWorkspaceQuarterContext(workspaceId: string): Promise<WorkspaceQuarterContext> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      quarters: {
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
      },
      activeQuarter: true
    }
  });

  if (!workspace) {
    throw new Error("Company not found.");
  }

  const activeQuarter = workspace.activeQuarter ?? (await ensureInitialQuarter(workspaceId));
  if (!workspace.activeQuarter || workspace.activeQuarterId !== activeQuarter.id) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { activeQuarterId: activeQuarter.id }
    });
  }

  const quarters = workspace.quarters.length
    ? workspace.quarters
        .map((quarter) => ({
          ...toQuarter(quarter),
          active: quarter.id === activeQuarter.id
        }))
        .sort((left, right) => right.startDate.localeCompare(left.startDate))
    : [
        {
          ...toQuarter(activeQuarter),
          active: true
        }
      ];

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    currentQuarterId: activeQuarter.id,
    currentQuarter: {
      label: activeQuarter.label,
      startDate: toIsoDate(activeQuarter.startDate),
      endDate: toIsoDate(activeQuarter.endDate),
      locked: activeQuarter.locked
    },
    quarters
  };
}

export async function getCurrentWorkspaceQuarter(workspaceId: string) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  return context.currentQuarter;
}

export async function resolveWorkspaceQuarter(workspaceId: string, quarterId?: string) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  const selectedQuarter = quarterId
    ? context.quarters.find((quarter) => quarter.id === quarterId)
    : context.quarters.find((quarter) => quarter.active) ?? context.quarters[0];

  if (!selectedQuarter) {
    return {
      context,
      selectedQuarter: {
        id: context.currentQuarterId,
        ...context.currentQuarter,
        active: true
      }
    };
  }

  return { context, selectedQuarter };
}

export async function listWorkspaceQuarters(workspaceId: string) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  return context.quarters;
}

export async function toggleCurrentQuarterLock(workspaceId: string, locked: boolean) {
  const context = await getWorkspaceQuarterContext(workspaceId);
  const activeQuarterId = context.quarters.find((quarter) => quarter.active)?.id ?? context.quarters[0]?.id;
  if (!activeQuarterId) {
    throw new Error("Current quarter not found.");
  }

  const updatedQuarter = await prisma.reportingQuarter.update({
    where: { id: activeQuarterId },
    data: { locked }
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { quarterLocked: locked, activeQuarterId: updatedQuarter.id }
  });

  return updatedQuarter;
}

function computeNextQuarterStartDate(currentEndDate: Date) {
  return addUtcDays(currentEndDate, 1);
}

export async function createNextQuarter(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      activeQuarter: true,
      quarters: {
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!workspace) {
    throw new Error("Company not found.");
  }

  const currentQuarter = workspace.activeQuarter ?? (await ensureInitialQuarter(workspaceId));
  const nextStart = computeNextQuarterStartDate(currentQuarter.endDate);
  const { startDate, endDate } = nextQuarterDates(nextStart);
  const nextQuarter = buildQuarterFromDates(startDate, endDate, false, workspace.financialYearStartMonth ?? 7);

  const created = await prisma.reportingQuarter.create({
    data: {
      workspaceId,
      label: nextQuarter.label,
      startDate: nextStart,
      endDate,
      locked: false
    }
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      activeQuarterId: created.id,
      quarterLocked: false
    }
  });

  return created;
}
