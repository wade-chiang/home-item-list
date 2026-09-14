import { describe, expect, it } from "vitest";
import { parseThemePreference, readThemePreference } from "./preferences.ts";

describe("parseThemePreference", () => {
  it("認得淺色與深色", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("沒存過或值不認得時是跟隨系統", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("Dark")).toBe("system");
    expect(parseThemePreference("")).toBe("system");
  });
});

describe("readThemePreference", () => {
  it("沒有 localStorage 的環境不會丟錯，當成跟隨系統", () => {
    // Vitest 預設跑在 Node，沒有 localStorage
    expect(readThemePreference()).toBe("system");
  });
});
