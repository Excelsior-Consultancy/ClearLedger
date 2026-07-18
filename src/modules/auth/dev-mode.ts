const LOCAL_DEV_AUTO_LOGIN_ENV = "CLEARLEDGER_DEV_AUTO_LOGIN";
const LOCAL_DEV_EMAIL_ENV = "CLEARLEDGER_DEV_EMAIL";
const LOCAL_DEV_NAME_ENV = "CLEARLEDGER_DEV_NAME";
const LOCAL_DEV_WORKSPACE_ID_ENV = "CLEARLEDGER_DEV_WORKSPACE_ID";

export type LocalDevAuthBootstrap = {
  email: string;
  name: string;
  workspaceId: string;
};

function isTruthy(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isLocalDevAutoLoginEnabled() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const raw = process.env[LOCAL_DEV_AUTO_LOGIN_ENV];
  if (raw === undefined || raw === null || raw.trim() === "") {
    return true;
  }

  return isTruthy(raw);
}

export function getLocalDevAuthBootstrap(): LocalDevAuthBootstrap | null {
  if (!isLocalDevAutoLoginEnabled()) {
    return null;
  }

  return {
    email: envValue(LOCAL_DEV_EMAIL_ENV) ?? "123@123.com",
    name: envValue(LOCAL_DEV_NAME_ENV) ?? "Business Owner",
    workspaceId: envValue(LOCAL_DEV_WORKSPACE_ID_ENV) ?? "excelsior-fy2025-26"
  };
}
