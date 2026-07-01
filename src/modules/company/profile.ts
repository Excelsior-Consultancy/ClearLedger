export type CompanyProfileFields = {
  name?: string | null;
  legalName?: string | null;
  abn?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  gstRegistered?: boolean | null;
  gstAccountingBasis?: string | null;
  basFrequency?: string | null;
  financialYearStartMonth?: number | null;
  invoicePrefix?: string | null;
};

export type CompanyProfileIssue = {
  field: keyof CompanyProfileFields;
  message: string;
};

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function normalizeAbn(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatAbn(value: string) {
  const digits = normalizeAbn(value);
  if (digits.length !== 11) {
    return value.trim();
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function isValidAbn(value: string) {
  const digits = normalizeAbn(value);
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  const checksum =
    ABN_WEIGHTS.reduce((total, weight, index) => {
      const digit = Number(digits[index]);
      const adjustedDigit = index === 0 ? digit - 1 : digit;
      return total + adjustedDigit * weight;
    }, 0) % 89;

  return checksum === 0;
}

export function validateContactEmail(value: string) {
  const email = value.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatGstAccountingBasis(value: string) {
  if (value === "CASH") return "Cash";
  if (value === "ACCRUAL") return "Accrual";
  return value;
}

export function toBasFilingBasis(value?: string | null) {
  const normalized = value?.toUpperCase();
  if (normalized === "CASH") return "cash" as const;
  if (normalized === "ACCRUAL") return "accrual" as const;
  return "not_configured" as const;
}

export function getCompanyProfileIssues(profile: CompanyProfileFields): CompanyProfileIssue[] {
  const issues: CompanyProfileIssue[] = [];

  if (!profile.name?.trim()) {
    issues.push({ field: "name", message: "Company name is required." });
  }
  if (!profile.legalName?.trim()) {
    issues.push({ field: "legalName", message: "Legal name is required." });
  }
  if (!profile.abn?.trim()) {
    issues.push({ field: "abn", message: "ABN is required." });
  } else if (!isValidAbn(profile.abn)) {
    issues.push({ field: "abn", message: "Enter a valid 11-digit ABN." });
  }
  if (!profile.contactEmail?.trim()) {
    issues.push({ field: "contactEmail", message: "Contact email is required." });
  } else if (!validateContactEmail(profile.contactEmail)) {
    issues.push({ field: "contactEmail", message: "Enter a valid contact email." });
  }
  if (!profile.address?.trim()) {
    issues.push({ field: "address", message: "Registered business address is required." });
  }
  if (profile.gstRegistered === null || profile.gstRegistered === undefined) {
    issues.push({ field: "gstRegistered", message: "GST registration status is required." });
  }
  if (!profile.gstAccountingBasis?.trim()) {
    issues.push({ field: "gstAccountingBasis", message: "GST accounting basis is required." });
  } else if (!["CASH", "ACCRUAL"].includes(profile.gstAccountingBasis)) {
    issues.push({ field: "gstAccountingBasis", message: "Select cash or accrual GST accounting." });
  }
  if (!profile.basFrequency?.trim()) {
    issues.push({ field: "basFrequency", message: "BAS frequency is required." });
  }
  if (!profile.financialYearStartMonth) {
    issues.push({ field: "financialYearStartMonth", message: "Financial year start month is required." });
  }

  return issues;
}
