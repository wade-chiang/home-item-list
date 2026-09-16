import { describe, expect, it } from "vitest";
import { PALETTES } from "./palettes.ts";
import {
  parseItemIconsPreference,
  parsePalettePreference,
  parseThemePreference,
  readItemIconsPreference,
  readPalettePreference,
  readThemePreference,
} from "./preferences.ts";

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

describe("配色偏好", () => {
  it("認得清單裡的配色", () => {
    expect(parsePalettePreference("light", "mono")).toBe("mono");
    expect(parsePalettePreference("dark", "oled")).toBe("oled");
  });

  it("沒存過、值不認得、或用到另一個模式的 id 時是預設", () => {
    expect(parsePalettePreference("light", null)).toBe("slate");
    expect(parsePalettePreference("dark", null)).toBe("deepsea");
    expect(parsePalettePreference("light", "nope")).toBe("slate");
    // 深色的 id 不能用在淺色上
    expect(parsePalettePreference("light", "oled")).toBe("slate");
  });

  it("沒有 localStorage 的環境不會丟錯，當成預設", () => {
    expect(readPalettePreference("light")).toBe("slate");
    expect(readPalettePreference("dark")).toBe("deepsea");
  });

  it("預設是各清單的第一組，id 不重複", () => {
    for (const mode of ["light", "dark"] as const) {
      const ids = PALETTES[mode].map((palette) => palette.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(parsePalettePreference(mode, null)).toBe(ids[0]);
    }
  });
});

describe("物品 icon 顯示偏好", () => {
  it("預設開啟，只有存 off 時關閉", () => {
    expect(parseItemIconsPreference(null)).toBe(true);
    expect(parseItemIconsPreference("off")).toBe(false);
    expect(parseItemIconsPreference("anything")).toBe(true);
  });

  it("沒有 localStorage 的環境不會丟錯，當成開啟", () => {
    expect(readItemIconsPreference()).toBe(true);
  });
});
