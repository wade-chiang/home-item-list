import { daysBetween } from "../shared/date.ts";
import { sortLogsNewestFirst } from "../shared/due.ts";
import type { Log } from "../shared/types.ts";
import {
  buildItemEntries,
  type ItemEntriesInput,
  type ItemEntry,
} from "./itemEntries.ts";

// 物品詳情頁的資料。純函式，不含 React，方便單元測試。

export type HistoryRow = {
  log: Log;
  /** 與前一筆（較舊的那筆）相隔幾天。這筆或前一筆沒有日期時為 null（照原型） */
  gapDays: number | null;
  /** 最舊的一筆，畫面上沒有間隔天數時標「第一筆」 */
  isOldest: boolean;
};

export type ItemDetailData =
  { found: false } | { found: true; entry: ItemEntry; history: HistoryRow[] };

export function buildItemDetailData(
  input: ItemEntriesInput,
  itemId: string,
): ItemDetailData {
  const item = input.items.find((candidate) => candidate.id === itemId);
  if (item === undefined) {
    return { found: false };
  }

  // 只組這一個物品：其他物品的資料有問題時，不連帶讓這一頁壞掉
  const [entry] = buildItemEntries({ ...input, items: [item] });

  // 由新到舊，排序規則只有 due.ts 一份實作（CLAUDE.md）
  const logs = sortLogsNewestFirst(
    input.logs.filter((log) => log.itemId === item.id),
  );

  const history = logs.map((log, index) => {
    const older = index + 1 < logs.length ? logs[index + 1] : null;
    const gapDays =
      log.replacedOn !== null && older !== null && older.replacedOn !== null
        ? daysBetween(older.replacedOn, log.replacedOn)
        : null;
    return { log, gapDays, isOldest: index === logs.length - 1 };
  });

  return { found: true, entry, history };
}
