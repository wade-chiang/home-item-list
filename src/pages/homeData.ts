import type { Location } from "../shared/types.ts";
import {
  buildItemEntries,
  type ItemEntriesInput,
  type ItemEntry,
} from "./itemEntries.ts";

// 首頁的分組與統計。純函式，不含 React，方便單元測試。
// 物品與到期資訊的組合共用 itemEntries.ts，這裡只處理首頁特有的規則。

export type HomeGroup = {
  location: Location;
  items: ItemEntry[];
  hasOverdue: boolean;
};

export type HomeCounts = { overdue: number; soon: number; ok: number };

export type HomeData = {
  groups: HomeGroup[];
  counts: HomeCounts;
  /** 所有物品的數量（含暫停中），0 時顯示「還沒有任何物品」 */
  totalCount: number;
  /** 首頁最下方常駐的「N 項已暫停」（P2-2）：數量與所在位置，位置照設定的順序、不重複 */
  paused: { count: number; locationNames: string[] };
};

export function buildHomeData(input: ItemEntriesInput): HomeData {
  const entries = buildItemEntries(input);
  // 暫停中的物品不出現在位置區塊（PRODUCT.md §3.2），改由最下方的「N 項已暫停」常駐顯示。
  // 用推導出的狀態判斷，不看 item.paused：到了預計恢復日的物品要回到位置區塊（見 due.ts 的 isPaused）
  const active = entries.filter((entry) => entry.status !== "paused");
  const pausedEntries = entries.filter((entry) => entry.status === "paused");

  const counts: HomeCounts = {
    overdue: active.filter((entry) => entry.status === "overdue").length,
    soon: active.filter((entry) => entry.status === "soon").length,
    ok: active.filter((entry) => entry.status === "ok").length,
  };

  // 位置照設定的順序（repo 已依 sortOrder 取回），組內依剩餘天數由少到多
  const groups: HomeGroup[] = input.locations
    .map((location) => {
      const groupItems = active
        .filter((entry) => entry.location.id === location.id)
        .toSorted((a, b) => a.daysLeft - b.daysLeft);
      return {
        location,
        items: groupItems,
        hasOverdue: groupItems.some((entry) => entry.status === "overdue"),
      };
    })
    .filter((group) => group.items.length > 0);

  return {
    // 有逾期物品的位置暫時置頂（PRODUCT.md §4.1）
    groups: [
      ...groups.filter((group) => group.hasOverdue),
      ...groups.filter((group) => !group.hasOverdue),
    ],
    counts,
    totalCount: entries.length,
    paused: {
      count: pausedEntries.length,
      locationNames: input.locations
        .filter((location) =>
          pausedEntries.some((entry) => entry.location.id === location.id),
        )
        .map((location) => location.name),
    },
  };
}
