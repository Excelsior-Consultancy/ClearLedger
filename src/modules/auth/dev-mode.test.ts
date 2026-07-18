import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDevAuthBootstrap, isLocalDevAutoLoginEnabled } from "./dev-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("local dev auth bootstrap", () => {
  it("defaults to auto-login in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isLocalDevAutoLoginEnabled()).toBe(true);
    expect(getLocalDevAuthBootstrap()).toEqual({
      email: "123@123.com",
      name: "Business Owner",
      workspaceId: "excelsior-fy2025-26"
    });
  });

  it("stays disabled outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLEARLEDGER_DEV_AUTO_LOGIN", "true");

    expect(isLocalDevAutoLoginEnabled()).toBe(false);
    expect(getLocalDevAuthBootstrap()).toBeNull();
  });

  it("allows opting out in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLEARLEDGER_DEV_AUTO_LOGIN", "false");

    expect(isLocalDevAutoLoginEnabled()).toBe(false);
    expect(getLocalDevAuthBootstrap()).toBeNull();
  });

  it("allows overriding the default bootstrap identity", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLEARLEDGER_DEV_AUTO_LOGIN", "1");
    vi.stubEnv("CLEARLEDGER_DEV_EMAIL", "owner@example.com");
    vi.stubEnv("CLEARLEDGER_DEV_NAME", "Owner");
    vi.stubEnv("CLEARLEDGER_DEV_WORKSPACE_ID", "harbour-advisory");

    expect(getLocalDevAuthBootstrap()).toEqual({
      email: "owner@example.com",
      name: "Owner",
      workspaceId: "harbour-advisory"
    });
  });
});
