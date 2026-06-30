import { getCompanyProfileIssues } from "@/modules/company/profile";

export type SetupWorkspace = {
  name?: string | null;
  legalName?: string | null;
  abn?: string | null;
  address?: string | null;
  contactEmail?: string | null;
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

export function getOnboardingReadiness(workspace: SetupWorkspace): SetupReadiness {
  const blockers = getCompanyProfileIssues(workspace).map((issue) => issue.message);
  const warnings: string[] = [];

  if (workspace.name?.trim() && workspace.name.length < 3) {
    warnings.push("Company name looks unusually short.");
  }

  return {
    complete: blockers.length === 0,
    blockers,
    warnings
  };
}

export function getSetupReadiness(workspace: SetupWorkspace): SetupReadiness {
  const onboarding = getOnboardingReadiness(workspace);
  const blockers = [...onboarding.blockers];
  const warnings = [...onboarding.warnings];

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
