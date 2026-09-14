import { CYCLE_PRESETS } from "../components/cyclePresets.ts";
import { formatMonthDay, isFilled } from "../shared/display.ts";
import { calcDue, latestLog } from "../shared/due.ts";
import type { IsoDate, Log } from "../shared/types.ts";
import {
  isIsoDateText,
  optionalText,
  parsePositiveInteger,
} from "./formValues.ts";

// 編輯更換紀錄面板的狀態、驗證、送出資料與提示條文字。純函式，不含 React，方便單元測試。
// 流程照 docs/prototype/p0.html 的 openLogEdit()、outcomeText() 與 PRODUCT.md §5.4。

export type LogFormState = {
  /** 日期未記錄的紀錄一開始是 false，選「補上日期」後變 true；有日期的紀錄固定是 true */
  hasDate: boolean;
  date: string;
  brand: string;
  model: string;
  cycle: string;
  customCycle: boolean;
  note: string;
};

export type LogFormErrors = Partial<Record<"date" | "cycle", string>>;

export type LogSubmission =
  { ok: true; log: Log } | { ok: false; errors: LogFormErrors };

export function initialLogForm(log: Log, today: IsoDate): LogFormState {
  return {
    hasDate: log.replacedOn !== null,
    // 補上日期時預設今天（照原型）
    date: log.replacedOn ?? today,
    brand: isFilled(log.brand) ? log.brand : "",
    model: isFilled(log.model) ? log.model : "",
    cycle: String(log.cycleDays),
    customCycle: !CYCLE_PRESETS.includes(log.cycleDays),
    note: isFilled(log.note) ? log.note : "",
  };
}

export function buildLogSubmission(
  form: LogFormState,
  log: Log,
  today: IsoDate,
): LogSubmission {
  const errors: LogFormErrors = {};

  // 可以改到比其他紀錄早或晚，但不能晚於今天：更換紀錄記的是已經發生的事（P1-18 確認）
  if (form.hasDate) {
    if (!isIsoDateText(form.date)) {
      errors.date = "請選擇更換日期";
    } else if (form.date > today) {
      errors.date = "更換日期不能晚於今天";
    }
  }

  const cycleDays = parsePositiveInteger(form.cycle);
  if (cycleDays === null) {
    // 文字照原型
    errors.cycle = "請填週期天數";
  }

  if (cycleDays === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const fields = {
    cycleDays,
    brand: optionalText(form.brand),
    model: optionalText(form.model),
    note: optionalText(form.note),
  };

  // 補上日期後清掉預計到期日（PRODUCT.md §5.4）；沒補的話日期與預計到期日原樣保留
  const updated: Log = form.hasDate
    ? {
        ...log,
        ...fields,
        replacedOn: form.date as IsoDate,
        expectedDue: null,
      }
    : { ...log, ...fields };

  return { ok: true, log: updated };
}

/** 只剩一筆時不能刪除（CLAUDE.md「每個物品至少一筆更換紀錄」） */
export function canDeleteLog(logs: readonly Log[]): boolean {
  return logs.length > 1;
}

/**
 * 修改或刪除後的結果說明，例如「這筆現在是最近一次，到期日改為 12/1」（PRODUCT.md §5.4）。
 * 最近一次與到期日都沒變時回 null。判斷一律呼叫 due.ts，不另寫排序或到期日計算。
 *
 * @param selfId 被修改的那筆；刪除時傳 null
 */
export function describeOutcome(
  before: readonly Log[],
  after: readonly Log[],
  selfId: Log["id"] | null,
): string | null {
  const parts: string[] = [];

  const previousLatest = latestLog(before);
  const nextLatest = latestLog(after);
  if (previousLatest.id !== nextLatest.id) {
    parts.push(
      nextLatest.id === selfId
        ? "這筆現在是最近一次"
        : `${nextLatest.replacedOn ?? "日期未記錄"} 那筆現在是最近一次`,
    );
  }

  const nextDue = calcDue(after);
  if (calcDue(before) !== nextDue) {
    parts.push(`到期日改為 ${formatMonthDay(nextDue)}`);
  }

  return parts.length === 0 ? null : parts.join("，");
}
