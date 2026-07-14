import { getCompanyProfileIssues } from "@/modules/company/profile";

export type SetupWorkspace = {
  name?: string | null;
  legalName?: string | null;
  abn?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  gstRegistered?: boolean | null;
  gstAccountingBasis?: string | null;
  basFrequency?: string | null;
  financialYearStartMonth?: number | null;
  bankAccounts: Array<{ active: boolean }>;
  categories: Array<{ active: boolean }>;
  people?: Array<{ active: boolean }>;
};

export type SetupReadiness = {
  complete: boolean;
  blockers: string[];
  warnings: string[];
};

export type SetupJourneySection = {
  id: "company-profile" | "bank-accounts" | "categories" | "people";
  title: string;
  required: boolean;
  complete: boolean;
  blockers: string[];
  description: string;
};

export type SetupJourney = {
  sections: SetupJourneySection[];
  requiredCompleteCount: number;
  requiredTotalCount: number;
  optionalCompleteCount: number;
  optionalTotalCount: number;
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

export function getSetupJourney(workspace: SetupWorkspace): SetupJourney {
  const onboarding = getOnboardingReadiness(workspace);
  const hasActiveBankAccount = workspace.bankAccounts.some((account) => account.active);
  const hasActiveCategory = workspace.categories.some((category) => category.active);
  const hasActivePerson = (workspace.people ?? []).some((person) => person.active);

  const sections: SetupJourneySection[] = [
    {
      id: "company-profile",
      title: "Company profile",
      required: true,
      complete: onboarding.blockers.length === 0,
      blockers: onboarding.blockers,
      description: "Used for invoices, BAS timing, and company identity."
    },
    {
      id: "bank-accounts",
      title: "Bank accounts",
      required: true,
      complete: hasActiveBankAccount,
      blockers: hasActiveBankAccount ? [] : ["At least one active bank account is required."],
      description: "Needed for expense traceability and quarter review."
    },
    {
      id: "categories",
      title: "Categories",
      required: true,
      complete: hasActiveCategory,
      blockers: hasActiveCategory ? [] : ["At least one active category is required."],
      description: "Drives GST treatment and BAS reporting."
    },
    {
      id: "people",
      title: "Payroll people",
      required: false,
      complete: hasActivePerson,
      blockers: [],
      description: "Optional until payroll is active for this workspace."
    }
  ];

  const requiredSections = sections.filter((section) => section.required);
  const optionalSections = sections.filter((section) => !section.required);
  const blockers = requiredSections.flatMap((section) => section.blockers);
  const warnings = [...onboarding.warnings];

  if (!hasActivePerson && (workspace.people ?? []).length === 0) {
    warnings.push("Payroll people are optional for setup, but payroll will stay empty until you add one.");
  }

  return {
    sections,
    requiredCompleteCount: requiredSections.filter((section) => section.complete).length,
    requiredTotalCount: requiredSections.length,
    optionalCompleteCount: optionalSections.filter((section) => section.complete).length,
    optionalTotalCount: optionalSections.length,
    complete: blockers.length === 0,
    blockers,
    warnings
  };
}

export function getSetupReadiness(workspace: SetupWorkspace): SetupReadiness {
  const journey = getSetupJourney(workspace);

  return {
    complete: journey.complete,
    blockers: journey.blockers,
    warnings: journey.warnings
  };
}
