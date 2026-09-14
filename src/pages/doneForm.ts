import { CYCLE_PRESETS } from "../components/cyclePresets.ts";
import type { NewLog } from "../repo/index.ts";
import { isSameBrandModel } from "../shared/brandModel.ts";
import { brandModelText, isFilled } from "../shared/display.ts";
import { latestLog } from "../shared/due.ts";
import type { IsoDate, Log } from "../shared/types.ts";
import {
  isIsoDateText,
  optionalText,
  parsePositiveInteger,
} from "./formValues.ts";

// 換好了面板的狀態、提示、驗證與送出資料。純函式，不含 React，方便單元測試。
// 流程照 docs/prototype/p0.html 的 openDone() 與 PRODUCT.md §5.1。

export type DoneDate = "today" | "other";

export type DoneFormState = {
  date: DoneDate;
  otherDate: string;
  brand: string;
  model: string;
  cycle: string;
  customCycle: boolean;
  note: string;
};

export type DoneFormErrors = Partial<Record<"otherDate" | "cycle", string>>;

export type DoneSubmission =
  { ok: true; log: NewLog } | { ok: false; errors: DoneFormErrors };

/** 品牌、型號、週期全部預填最近一筆更換紀錄的值（PRODUCT.md §5.1） */
export function initialDoneForm(latest: Log, today: IsoDate): DoneFormState {
  return {
    date: "today",
    otherDate: today,
    brand: isFilled(latest.brand) ? latest.brand : "",
    model: isFilled(latest.model) ? latest.model : "",
    cycle: String(latest.cycleDays),
    // 上次的週期不在快速選項裡時，直接打開自訂並帶入天數（照原型）
    customCycle: !CYCLE_PRESETS.includes(latest.cycleDays),
    // 備註不預填上一次：通路與狀況每次不同，預填容易把舊內容又存一次（PRODUCT.md §5.1）
    note: "",
  };
}

export type BrandModelHint = "same" | "lastEmpty" | "changed";

/**
 * 品牌型號下方的提示。比較用 src/shared/brandModel.ts 的字串整理（P1-15 確認），
 * 之後 P2-9 的型號變更標示也用同一份，兩處才不會一個說相同、一個說不同。
 */
export function brandModelHint(
  form: Pick<DoneFormState, "brand" | "model">,
  latest: Log,
): BrandModelHint {
  const same =
    isSameBrandModel(form.brand, latest.brand) &&
    isSameBrandModel(form.model, latest.model);
  if (!same) {
    return "changed";
  }
  return brandModelText(latest) === null ? "lastEmpty" : "same";
}

// 「，歷史會標示『型號變更』」照原型，P2-9 做好更換歷史的標示後加回（P1-15 確認）
export const BRAND_MODEL_HINT_TEXT: Record<BrandModelHint, string> = {
  same: "沿用上次",
  lastEmpty: "上次沒填",
  changed: "與上次不同，歷史會標示「型號變更」",
};

/** 週期是否跟最近一筆相同。還沒填好（空白或不合法）時算不同 */
export function isSameCycle(
  form: Pick<DoneFormState, "cycle">,
  latest: Log,
): boolean {
  return parsePositiveInteger(form.cycle) === latest.cycleDays;
}

export function buildDoneSubmission(
  form: DoneFormState,
  today: IsoDate,
): DoneSubmission {
  const errors: DoneFormErrors = {};

  if (form.date === "other") {
    if (!isIsoDateText(form.otherDate)) {
      errors.otherDate = "請選擇更換日期";
    } else if (form.otherDate > today) {
      errors.otherDate = "更換日期不能晚於今天";
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

  return {
    ok: true,
    log: {
      replacedOn: form.date === "today" ? today : (form.otherDate as IsoDate),
      expectedDue: null,
      cycleDays,
      brand: optionalText(form.brand),
      model: optionalText(form.model),
      note: optionalText(form.note),
      purchaseId: null,
    },
  };
}

/**
 * 新寫入的紀錄是否成為最近一筆。不是的話，代表日期早於上次更換，到期日沒有變。
 * 判斷直接交給 due.ts 的排序（排序規則只能有一份實作）。原本的最近一筆已經比其他紀錄新，只要跟它比。
 */
export function becomesLatest(previousLatest: Log, created: Log): boolean {
  return latestLog([previousLatest, created]).id === created.id;
}
