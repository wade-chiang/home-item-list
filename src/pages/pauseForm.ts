import { addDays } from "../shared/date.ts";
import type { IsoDate } from "../shared/types.ts";
import { isIsoDateText } from "./formValues.ts";

// 暫停面板的選項與驗證。純函式，不含 React，方便單元測試。
// 流程照 docs/prototype/p0.html 的 openPause() 與 PRODUCT.md §5.3。

export type PauseChoice = "threeMonths" | "may" | "custom";

/**
 * 下一個 5 月 1 日（P2-1 確認）。原型寫死「明年 5/1」，在 3 月暫停會變成 14 個月後；
 * 改成今天在 5/1 之前就是今年、當天或之後就是明年。恢復日必須晚於今天，所以 5/1 當天算明年。
 */
export function nextMayFirst(today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-05-01` as IsoDate;
  return today < thisYear ? thisYear : (`${year + 1}-05-01` as IsoDate);
}

/** 快速選項對應的恢復日：3 個月後照原型算 90 天 */
export function pauseOptionDates(today: IsoDate): {
  threeMonths: IsoDate;
  may: IsoDate;
} {
  return { threeMonths: addDays(today, 90), may: nextMayFirst(today) };
}

/** 指定日期的預設值：照原型 120 天後 */
export function defaultCustomPauseDate(today: IsoDate): IsoDate {
  return addDays(today, 120);
}

export type PauseSubmission =
  { ok: true; pausedUntil: IsoDate } | { ok: false; error: string };

/**
 * 預計恢復日必填，而且要晚於今天（CLAUDE.md「暫停會靜默失效」）。
 * 選今天的話，推導出的狀態當天就已恢復（due.ts 的 isPaused），暫停不會生效。
 */
export function buildPause(
  choice: PauseChoice | null,
  customDate: string,
  today: IsoDate,
): PauseSubmission {
  if (choice === null) {
    // 文字照原型
    return { ok: false, error: "請先選一個恢復時間" };
  }
  if (choice === "threeMonths" || choice === "may") {
    return { ok: true, pausedUntil: pauseOptionDates(today)[choice] };
  }
  if (!isIsoDateText(customDate)) {
    return { ok: false, error: "請選擇預計恢復日" };
  }
  if (customDate <= today) {
    return { ok: false, error: "預計恢復日要晚於今天" };
  }
  return { ok: true, pausedUntil: customDate as IsoDate };
}
