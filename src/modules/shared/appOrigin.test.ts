import { describe, expect, it } from "vitest";
import { resolveRequestOrigin } from "./appOrigin";

function headers(entries: Record<string, string>) {
  return {
    get(name: string) {
      return entries[name.toLowerCase()] ?? null;
    }
  } as Headers;
}

describe("resolveRequestOrigin", () => {
  it("prefers the explicit origin header", () => {
    expect(
      resolveRequestOrigin({
        headers: headers({
          origin: "http://localhost:3000",
          host: "127.0.0.1:3000"
        })
      })
    ).toBe("http://localhost:3000");
  });

  it("falls back to host headers when origin is absent", () => {
    expect(
      resolveRequestOrigin({
        headers: headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "example.com"
        })
      })
    ).toBe("https://example.com");
  });
});
