import { describe, expect, it } from "vitest";
import { moveItem, nextSortOrder, validatePlaceName } from "./placeForm.ts";

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

describe("moveItem", () => {
  it("往後搬與往前搬", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("不改動傳入的陣列；位置超出範圍時不搬", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 1)).toEqual(["b", "a"]);
    expect(items).toEqual(["a", "b"]);
    expect(moveItem(items, 5, 0)).toEqual(["a", "b"]);
  });
});
