import type { IsoDate, ItemStatus, Log } from "./types.ts";

// 顯示用的共用函式，只有一份實作：多個頁面都會組同樣的字串（首頁、物品頁、詳情頁）。

/**
 * 選填欄位有沒有填。
 * UI 一律呼叫這個函式，不要直接跟 null 比較：之後若改變空值的表示方式，只要改這裡
 * （CLAUDE.md「型別要自己顧」：從 null 改回空字串時 TypeScript 抓不到舊的判斷）。
 */
export function isFilled(value: string | null): value is string {
  return value !== null && value.trim() !== "";
}

/** 顯示名稱 ＝ 位置 ＋ 類別 ＋ 補充名稱（有填才加），例如「主臥 · 冷氣濾網 · 水槽」 */
export function displayName(
  locationName: string,
  categoryName: string,
  label: string | null,
): string {
  const parts = [locationName, categoryName];
  if (isFilled(label)) {
    parts.push(label);
  }
  return parts.join(" · ");
}

/** 品牌 ＋ 型號。都沒填時回 null：畫面上留空，不顯示替代文字（CLAUDE.md 決策紀錄） */
export function brandModelText(
  log: Pick<Log, "brand" | "model">,
): string | null {
  const parts = [log.brand, log.model].filter(isFilled);
  return parts.length === 0 ? null : parts.join(" ");
}

/** 列表第二行：有品牌型號時「3M 淨呼吸 9808 · 90 天」，沒填時只剩「90 天」 */
export function brandModelLine(
  log: Pick<Log, "brand" | "model" | "cycleDays">,
): string {
  const text = brandModelText(log);
  return text === null
    ? `${log.cycleDays} 天`
    : `${text} · ${log.cycleDays} 天`;
}

/** YYYY-MM-DD → M/D，不補零（照原型：2026-12-01 顯示成 12/1） */
export function formatMonthDay(date: IsoDate): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 剩餘天數的文字：「逾期 3 天」「今天到期」「還有 12 天」「暫停至 12/1」 */
export function daysText(
  status: ItemStatus,
  daysLeft: number,
  pausedUntil: IsoDate | null,
): string {
  if (status === "paused" && pausedUntil !== null) {
    return `暫停至 ${formatMonthDay(pausedUntil)}`;
  }
  if (daysLeft < 0) {
    return `逾期 ${-daysLeft} 天`;
  }
  if (daysLeft === 0) {
    return "今天到期";
  }
  return `還有 ${daysLeft} 天`;
}
