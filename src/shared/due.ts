import { addDays, daysBetween } from "./date.ts";
import type { IsoDate, Item, ItemStatus, Log } from "./types.ts";

// 到期與狀態計算的唯一實作（CLAUDE.md「到期日是推導值」）。
// 首頁、物品頁、詳情頁與之後的本地通知都呼叫這裡，不得在別處重算。

/**
 * 更換紀錄由新到舊（唯一的排序規則）：
 * 1. 依更換日期由新到舊
 * 2. 日期未記錄的排最後
 * 3. 同一天（或都未記錄）時，較晚建立的較新
 *
 * YYYY-MM-DD 與 ISO 8601 時間戳的字串順序就是時間先後，所以直接比較字串。不改動傳入的陣列。
 */
export function sortLogsNewestFirst(logs: readonly Log[]): Log[] {
  return logs.toSorted((a, b) => {
    if (a.replacedOn !== b.replacedOn) {
      if (a.replacedOn === null) {
        return 1;
      }
      if (b.replacedOn === null) {
        return -1;
      }
      return a.replacedOn < b.replacedOn ? 1 : -1;
    }
    if (a.createdAt === b.createdAt) {
      return 0;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** 最近一筆更換紀錄。沒有任何紀錄時丟出錯誤：每個物品至少一筆是資料的不變條件（CLAUDE.md），違反時要被看見 */
export function latestLog(logs: readonly Log[]): Log {
  if (logs.length === 0) {
    throw new Error("物品沒有任何更換紀錄，違反「每個物品至少一筆更換紀錄」");
  }
  return sortLogsNewestFirst(logs)[0];
}

/** 到期日 = 最近一筆的更換日期 + 該筆週期；最近一筆日期未記錄時，用該筆的預計到期日 */
export function calcDue(logs: readonly Log[]): IsoDate {
  const latest = latestLog(logs);
  if (latest.replacedOn !== null) {
    return addDays(latest.replacedOn, latest.cycleDays);
  }
  return latest.expectedDue;
}

/** 距到期還有幾天：正數是還有 N 天，0 是今天到期，負數是逾期 N 天 */
export function daysUntilDue(due: IsoDate, today: IsoDate): number {
  return daysBetween(today, due);
}

/**
 * 現在是否暫停中。到了預計恢復日（今天 >= pausedUntil）就當成已恢復（P2-1 確認：推導，不寫回資料庫）。
 *
 * 資料庫裡可能留著「paused 是 true、但日期已過」的物品，所以**畫面與判斷一律呼叫這個函式，不要直接看 item.paused**。
 * 沒有伺服器排程也成立：首頁、物品頁、詳情頁與 P3 的本地通知都用同一個判斷，離線時也一樣。
 */
export function isPaused(item: Item, today: IsoDate): boolean {
  // YYYY-MM-DD 的字串順序就是日期先後
  return item.paused && today < item.pausedUntil;
}

/** 狀態，由上而下先中先算（PRODUCT.md §3.2）：暫停 → 逾期 → 即將到期 → 正常 */
export function calcStatus(
  item: Item,
  due: IsoDate,
  today: IsoDate,
): ItemStatus {
  // 恢復後到期日不順延暫停的天數（P2-1 確認）：冬天暫停的冷氣濾網到 5 月恢復時通常直接逾期，正好提醒檢查
  if (isPaused(item, today)) {
    return "paused";
  }
  const daysLeft = daysUntilDue(due, today);
  if (daysLeft < 0) {
    return "overdue";
  }
  // leadDays 為 0 時，只有到期當天算即將到期
  if (daysLeft <= item.leadDays) {
    return "soon";
  }
  return "ok";
}
