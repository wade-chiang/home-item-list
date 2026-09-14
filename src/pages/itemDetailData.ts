import { isSameBrandModel } from "../shared/brandModel.ts";
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
  /** 品牌或型號跟前一筆不同，標示「型號變更」（PRODUCT.md §3.4）。最舊的一筆沒有前一筆，是 false */
  modelChanged: boolean;
  /** 週期跟前一筆不同時是前一筆的週期，標示「週期 90 → 60」；相同或沒有前一筆時是 null */
  previousCycleDays: number | null;
};

/** 實際間隔回饋（PRODUCT.md §3.5）。只提示，不自動改週期（CLAUDE.md「下次到期用這次填的週期」） */
export type IntervalFeedback = {
  /** 目前週期：最近一筆更換紀錄的週期 */
  currentCycleDays: number;
  /** 最近幾次實際間隔的平均（四捨五入到整天） */
  averageDays: number;
  /** 用來算平均的間隔，由新到舊 */
  gaps: number[];
  /** 建議改成的週期 */
  suggestedCycleDays: number;
};

/** 平均只看最近 3 次間隔（P2-9 確認）：用了幾年後，全部平均會被很久以前的習慣拖住 */
export const RECENT_GAP_COUNT = 3;

/** 至少要有這麼多個間隔才顯示回饋（PRODUCT.md §3.5） */
const MIN_GAP_COUNT = 2;

/** 平均跟目前週期差這麼多天以上才顯示回饋（PRODUCT.md §3.5） */
const MIN_DIFFERENCE_DAYS = 10;

/**
 * 建議週期：平均 30 天以上四捨五入到 10 天；30 天以下用平均本身，不小於 1 天（P2-9 確認）。
 * 原型一律四捨五入到 10 天，週期 30、平均 7 天時會建議 10 天，平均 4 天時會變 0 天
 */
export function suggestCycleDays(averageDays: number): number {
  if (averageDays >= 30) {
    return Math.round(averageDays / 10) * 10;
  }
  return Math.max(1, averageDays);
}

/**
 * 由新到舊的更換紀錄算出實際間隔回饋；條件不符時回 null。
 * 間隔只算有日期的紀錄彼此之間（照原型），日期未記錄的跳過
 */
export function buildIntervalFeedback(
  logsNewestFirst: readonly Log[],
): IntervalFeedback | null {
  const latest = logsNewestFirst[0];
  if (latest === undefined) {
    return null;
  }
  const dated = logsNewestFirst.flatMap((log) =>
    log.replacedOn === null ? [] : [log.replacedOn],
  );
  const gaps: number[] = [];
  for (
    let index = 0;
    index + 1 < dated.length && gaps.length < RECENT_GAP_COUNT;
    index += 1
  ) {
    gaps.push(daysBetween(dated[index + 1], dated[index]));
  }
  if (gaps.length < MIN_GAP_COUNT) {
    return null;
  }

  const averageDays = Math.round(
    gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
  );
  if (Math.abs(averageDays - latest.cycleDays) < MIN_DIFFERENCE_DAYS) {
    return null;
  }
  return {
    currentCycleDays: latest.cycleDays,
    averageDays,
    gaps,
    suggestedCycleDays: suggestCycleDays(averageDays),
  };
}

export type ItemDetailData =
  | { found: false }
  | {
      found: true;
      entry: ItemEntry;
      history: HistoryRow[];
      feedback: IntervalFeedback | null;
    };

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
    return {
      log,
      gapDays,
      isOldest: index === logs.length - 1,
      // 比較前整理字串，品牌與型號各比一次；跟換好了面板的「與上次不同」用同一套判斷（CLAUDE.md）
      modelChanged:
        older !== null &&
        !(
          isSameBrandModel(log.brand, older.brand) &&
          isSameBrandModel(log.model, older.model)
        ),
      previousCycleDays:
        older !== null && older.cycleDays !== log.cycleDays
          ? older.cycleDays
          : null,
    };
  });

  return {
    found: true,
    entry,
    history,
    feedback: buildIntervalFeedback(logs),
  };
}
