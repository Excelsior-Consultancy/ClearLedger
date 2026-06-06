export type SetupWorkspace = {
  name?: string | null;
  gstRegistered?: boolean | null;
  basFrequency?: string | null;
  financialYearStartMonth?: number | null;
  bankAccounts: Array<{ active: boolean }>;
  categories: Array<{ active: boolean }>;
};

export type SetupReadiness = {
  complete: boolean;
  blockers: string[];
  warnings: string[];
};

export function getSetupReadiness(workspace: SetupWorkspace): SetupReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!workspace.name?.trim()) {
    blockers.push("Company name is required.");
  }
  if (workspace.gstRegistered === null || workspace.gstRegistered === undefined) {
    blockers.push("GST registration setting is required.");
  }
  if (!workspace.basFrequency) {
    blockers.push("BAS frequency is required.");
  }
  if (!workspace.financialYearStartMonth) {
    blockers.push("Financial year start month is required.");
  }
  if (!workspace.bankAccounts.some((account) => account.active)) {
    blockers.push("At least one active bank account is required.");
  }
  if (!workspace.categories.some((category) => category.active)) {
    blockers.push("At least one active category is required.");
  }

  if (workspace.name?.trim() && workspace.name.length < 3) {
    warnings.push("Company name looks unusually short.");
  }

  return {
    complete: blockers.length === 0,
    blockers,
    warnings
  };
}
