import { describe, expect, it } from "vitest";
import { nextSortOrder, validatePlaceName } from "./placeForm.ts";

describe("nextSortOrder", () => {
  it("沒有任何項目時從 0 開始", () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it("排在目前最大值之後，不受陣列順序影響", () => {
    expect(
      nextSortOrder([{ sortOrder: 2 }, { sortOrder: 5 }, { sortOrder: 1 }]),
    ).toBe(6);
  });
});

describe("validatePlaceName", () => {
  const existing = [{ name: "主臥" }, { name: "客廳" }];

  it("去掉頭尾空白後回傳名稱", () => {
    expect(validatePlaceName("  陽台 ", "location", existing)).toEqual({
      ok: true,
      name: "陽台",
    });
  });

  it("空白時依種類提示", () => {
    expect(validatePlaceName("   ", "location", existing)).toEqual({
      ok: false,
      error: "請填位置名稱",
    });
    expect(validatePlaceName("", "category", existing)).toEqual({
      ok: false,
      error: "請填類別名稱",
    });
  });

  it("跟現有名稱重複時擋下", () => {
    expect(validatePlaceName(" 主臥", "location", existing)).toEqual({
      ok: false,
      error: "已經有「主臥」了",
    });
  });
});
