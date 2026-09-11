import { describe, expect, it } from "vitest";
import { addDays, daysBetween, getToday } from "./date.ts";
import type { IsoDate } from "./types.ts";

const d = (value: string) => value as IsoDate;

describe("addDays", () => {
  it.each([
    { date: "2026-01-31", days: 1, expected: "2026-02-01" },
    { date: "2028-02-28", days: 1, expected: "2028-02-29" },
    { date: "2027-02-28", days: 1, expected: "2027-03-01" },
    { date: "2026-12-01", days: 31, expected: "2027-01-01" },
    { date: "2026-03-01", days: -1, expected: "2026-02-28" },
    { date: "2026-09-10", days: 90, expected: "2026-12-09" },
    { date: "2026-09-10", days: 0, expected: "2026-09-10" },
  ])("$date 加 $days 天是 $expected", ({ date, days, expected }) => {
    expect(addDays(d(date), days)).toBe(expected);
  });
});

describe("daysBetween", () => {
  it("較晚的日期為正，較早的為負，同一天為 0", () => {
    expect(daysBetween(d("2026-09-10"), d("2026-12-09"))).toBe(90);
    expect(daysBetween(d("2026-12-09"), d("2026-09-10"))).toBe(-90);
    expect(daysBetween(d("2026-09-10"), d("2026-09-10"))).toBe(0);
  });

  it("跨閏年的 2 月", () => {
    expect(daysBetween(d("2028-02-01"), d("2028-03-01"))).toBe(29);
    expect(daysBetween(d("2027-02-01"), d("2027-03-01"))).toBe(28);
  });
});

describe("getToday", () => {
  it("台北時間過了午夜就是隔天", () => {
    expect(
      getToday({
        timeZone: "Asia/Taipei",
        now: new Date("2026-09-11T15:59:59Z"),
      }),
    ).toBe("2026-09-11");
    expect(
      getToday({
        timeZone: "Asia/Taipei",
        now: new Date("2026-09-11T16:00:00Z"),
      }),
    ).toBe("2026-09-12");
  });

  it("同一個瞬間，不同時區的今天不同", () => {
    const now = new Date("2026-09-11T16:30:00Z");
    expect(getToday({ timeZone: "Asia/Taipei", now })).toBe("2026-09-12");
    expect(getToday({ timeZone: "America/New_York", now })).toBe("2026-09-11");
  });

  it("跨年", () => {
    expect(
      getToday({
        timeZone: "Asia/Taipei",
        now: new Date("2026-12-31T16:30:00Z"),
      }),
    ).toBe("2027-01-01");
  });

  it("時區名稱錯誤時丟出 RangeError", () => {
    expect(() => getToday({ timeZone: "Not/AZone" })).toThrow(RangeError);
  });
});
