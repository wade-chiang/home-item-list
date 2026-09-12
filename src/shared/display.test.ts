import { describe, expect, it } from "vitest";
import {
  brandModelLine,
  brandModelText,
  daysText,
  displayName,
  formatMonthDay,
  isFilled,
  shortDaysText,
} from "./display.ts";
import type { IsoDate } from "./types.ts";

const d = (value: string) => value as IsoDate;

describe("isFilled", () => {
  it("null、空字串、只有空白都算沒填", () => {
    expect(isFilled(null)).toBe(false);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
  });

  it("有文字就算有填", () => {
    expect(isFilled("水槽")).toBe(true);
  });
});

describe("displayName", () => {
  it("有補充名稱時接在最後", () => {
    expect(displayName("廚房", "濾心", "水槽")).toBe("廚房 · 濾心 · 水槽");
  });

  it("沒填補充名稱時只有位置與類別", () => {
    expect(displayName("主臥", "冷氣濾網", null)).toBe("主臥 · 冷氣濾網");
    expect(displayName("主臥", "冷氣濾網", "  ")).toBe("主臥 · 冷氣濾網");
  });
});

describe("brandModelText 與 brandModelLine", () => {
  it("品牌與型號都有", () => {
    const log = { brand: "3M", model: "淨呼吸 9808", cycleDays: 90 };
    expect(brandModelText(log)).toBe("3M 淨呼吸 9808");
    expect(brandModelLine(log)).toBe("3M 淨呼吸 9808 · 90 天");
  });

  it("只有品牌", () => {
    const log = { brand: "3M", model: null, cycleDays: 90 };
    expect(brandModelText(log)).toBe("3M");
    expect(brandModelLine(log)).toBe("3M · 90 天");
  });

  it("都沒填時留空，第二行只剩週期", () => {
    const log = { brand: null, model: null, cycleDays: 60 };
    expect(brandModelText(log)).toBeNull();
    expect(brandModelLine(log)).toBe("60 天");
  });
});

describe("formatMonthDay", () => {
  it("不補零", () => {
    expect(formatMonthDay(d("2026-12-01"))).toBe("12/1");
    expect(formatMonthDay(d("2026-09-05"))).toBe("9/5");
  });
});

describe("daysText（首頁用）", () => {
  it("逾期、今天到期、還有 N 天", () => {
    expect(daysText("overdue", -3, null)).toBe("逾期 3 天");
    expect(daysText("soon", 0, null)).toBe("今天到期");
    expect(daysText("ok", 12, null)).toBe("還有 12 天");
  });

  it("暫停中顯示預計恢復日", () => {
    expect(daysText("paused", -3, d("2026-12-01"))).toBe("暫停至 12/1");
  });
});

describe("shortDaysText（物品頁用）", () => {
  it("逾期、0 天、N 天", () => {
    expect(shortDaysText("overdue", -3)).toBe("逾期 3 天");
    expect(shortDaysText("soon", 0)).toBe("0 天");
    expect(shortDaysText("ok", 12)).toBe("12 天");
  });

  it("暫停中只顯示「暫停」", () => {
    expect(shortDaysText("paused", -3)).toBe("暫停");
  });
});
