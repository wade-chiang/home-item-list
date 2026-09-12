import { isFilled } from "../shared/display.ts";

// 表單欄位的共用轉換。新增物品與換好了面板都用，避免兩邊的判斷不一致。
// 輸入框的值都是字串，送出時才在這裡轉型。

/** 日期輸入框的值是否為 YYYY-MM-DD。YYYY-MM-DD 的字串順序就是日期先後，通過後可以直接比較 */
export function isIsoDateText(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 0 以上的整數，不合法時回 null。0 是合法值（例如提前提醒 0 天），不要寫成 `Number(x) || 預設值` */
export function parseNonNegativeInteger(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** 1 以上的整數（例如週期天數），不合法時回 null */
export function parsePositiveInteger(text: string): number | null {
  const value = parseNonNegativeInteger(text);
  return value !== null && value >= 1 ? value : null;
}

/** 選填文字：去掉頭尾空白，沒填時是 null（CLAUDE.md「型別要自己顧」） */
export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return isFilled(trimmed) ? trimmed : null;
}
