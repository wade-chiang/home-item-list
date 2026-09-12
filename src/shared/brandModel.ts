import { isFilled } from "./display.ts";

// 品牌型號比較前的字串整理，唯一實作（CLAUDE.md「品牌型號的比較只能有一份字串整理」）。
// 換好了面板的「與上次不同」提示先用；之後的型號變更標示（P2-9）與成本統計的品牌分組也要呼叫這裡，不要各寫一份。

/**
 * 整理規則：全形轉半形（NFKC）→ 連續空白合一 → 去頭尾空白 → 英文轉小寫。
 * NFKC 要先做：全形空白（U+3000）會被轉成一般空白，後面的空白整理才處理得到。
 * 沒填（null 或只有空白）一律整理成空字串。
 */
export function normalizeBrandModel(value: string | null): string {
  if (!isFilled(value)) {
    return "";
  }
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/** 兩個品牌（或兩個型號）整理後是否相同 */
export function isSameBrandModel(a: string | null, b: string | null): boolean {
  return normalizeBrandModel(a) === normalizeBrandModel(b);
}
