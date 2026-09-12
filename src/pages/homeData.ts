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
  /** 沒有暫停的物品總數，用來分辨「還沒有任何物品」與「有物品但都被暫停」 */
  activeCount: number;
};

export function buildHomeData(input: ItemEntriesInput): HomeData {
  // 暫停的物品不出現在位置區塊（PRODUCT.md §3.2）。P2-2 會在首頁最下方常駐顯示「N 項已暫停」
  const active = buildItemEntries(input).filter((entry) => !entry.item.paused);

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
    activeCount: active.length,
  };
}
