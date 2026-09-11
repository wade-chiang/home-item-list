import type { IsoDate } from "./types.ts";

// 純日期計算（CLAUDE.md「日期只存日期」）。
// 年月日一律用 UTC 計算，不經過本地時區：日期本身不帶時區，用本地時區加減天數會在夏令時間切換時差一天。

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMs(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10) as IsoDate;
}

/** 加減天數。2026-01-31 加 1 天是 2026-02-01；閏年 2028-02-28 加 1 天是 2028-02-29 */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** 從 from 到 to 相差幾天：to 較晚時為正，較早時為負 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return (toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY;
}

/**
 * 今天的日期。預設用裝置的時區：使用者在哪裡，「今天」就是當地的今天（CLAUDE.md 決策紀錄）。
 * 用 formatToParts 取出年月日自己組，不直接用格式化後的字串：各瀏覽器語系資料的日期格式不保證是 YYYY-MM-DD。
 * 語系固定用 en-US，數字才一定是阿拉伯數字。
 */
export function getToday(
  options: { timeZone?: string; now?: Date } = {},
): IsoDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: options.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(options.now ?? new Date());

  const get = (type: "year" | "month" | "day"): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (value === undefined) {
      throw new Error(`無法從日期格式取得 ${type}`);
    }
    return value;
  };

  return `${get("year")}-${get("month")}-${get("day")}` as IsoDate;
}
