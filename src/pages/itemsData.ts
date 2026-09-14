import type { Category } from "../shared/types.ts";
import {
  buildItemEntries,
  type ItemEntriesInput,
  type ItemEntry,
} from "./itemEntries.ts";

// 物品頁的分組與排序。純函式，不含 React，方便單元測試。

export type ItemsGroup = {
  category: Category;
  items: ItemEntry[];
};

export type ItemsData = {
  groups: ItemsGroup[];
  totalCount: number;
  pausedCount: number;
};

export function buildItemsData(input: ItemEntriesInput): ItemsData {
  const entries = buildItemEntries(input);

  // 類別照設定的順序（repo 已依 sortOrder 取回）
  const groups = input.categories
    .map((category) => ({
      category,
      // 暫停中的物品照樣列出，排在同類別的最後（PRODUCT.md §4.2）；兩邊各自依剩餘天數由少到多
      items: entries
        .filter((entry) => entry.category.id === category.id)
        .toSorted(
          (a, b) =>
            Number(a.status === "paused") - Number(b.status === "paused") ||
            a.daysLeft - b.daysLeft,
        ),
    }))
    .filter((group) => group.items.length > 0);

  return {
    groups,
    totalCount: entries.length,
    // 用推導出的狀態判斷：到了預計恢復日的物品不算暫停（due.ts 的 isPaused）
    pausedCount: entries.filter((entry) => entry.status === "paused").length,
  };
}
