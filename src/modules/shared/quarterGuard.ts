import { prisma } from "@/modules/db/prisma";
import { getCurrentWorkspaceQuarter } from "@/modules/quarters/service";

export async function getWorkspaceQuarterState(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { quarterLocked: true }
  });

  if (!workspace) {
    throw new Error("Complete company setup before continuing.");
  }

  const currentQuarter = await getCurrentWorkspaceQuarter(workspaceId);
  return {
    ...currentQuarter,
    locked: currentQuarter.locked || workspace.quarterLocked
  };
}

export async function assertQuarterEditable(workspaceId: string) {
  const quarter = await getWorkspaceQuarterState(workspaceId);
  if (quarter.locked) {
    throw new Error("This quarter is locked and cannot be edited.");
  }

  return quarter;
}
