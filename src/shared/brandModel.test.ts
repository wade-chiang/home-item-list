import { describe, expect, it } from "vitest";
import { isSameBrandModel, normalizeBrandModel } from "./brandModel.ts";

describe("normalizeBrandModel", () => {
  it("去頭尾空白、連續空白合一", () => {
    expect(normalizeBrandModel("  淨呼吸   9808 ")).toBe("淨呼吸 9808");
  });

  it("全形英數與全形空白轉半形", () => {
    expect(normalizeBrandModel("３Ｍ　淨呼吸")).toBe("3m 淨呼吸");
  });

  it("英文不分大小寫", () => {
    expect(normalizeBrandModel("Panasonic F-Y26")).toBe("panasonic f-y26");
  });

  it("沒填或只有空白時是空字串", () => {
    expect(normalizeBrandModel(null)).toBe("");
    expect(normalizeBrandModel("   ")).toBe("");
  });
});

describe("isSameBrandModel", () => {
  it("3M 和 ３ｍ 視為相同", () => {
    expect(isSameBrandModel("3M", "３ｍ")).toBe(true);
  });

  it("沒填和空白視為相同", () => {
    expect(isSameBrandModel(null, " ")).toBe(true);
  });

  it("不同型號視為不同", () => {
    expect(isSameBrandModel("9808", "9809")).toBe(false);
  });
});
