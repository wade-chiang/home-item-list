import type { ItemStatus, Location } from "../shared/types.ts";
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

/** 首頁快速篩選：點數量方塊選一個狀態（P2-10，PRODUCT.md §4.1） */
export type HomeFilter = Exclude<ItemStatus, "paused">;

export type HomeData = {
  /**
   * 實際生效的篩選。要求的狀態數量是 0 時會自動取消，這裡是 null
   * （例如剛把最後一個逾期的換好，PRODUCT.md §4.1）
   */
  filter: HomeFilter | null;
  groups: HomeGroup[];
  counts: HomeCounts;
  /** 所有物品的數量（含暫停中），0 時顯示「還沒有任何物品」 */
  totalCount: number;
  /** 首頁最下方常駐的「N 項已暫停」（P2-2）：數量與所在位置，位置照設定的順序、不重複 */
  paused: { count: number; locationNames: string[] };
};

export function buildHomeData(
  input: ItemEntriesInput,
  requestedFilter: HomeFilter | null = null,
): HomeData {
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

  // 數量維持總數，不隨篩選變動（上面的 counts 用全部物品算）
  const filter =
    requestedFilter !== null && counts[requestedFilter] > 0
      ? requestedFilter
      : null;
  const shown =
    filter === null
      ? active
      : active.filter((entry) => entry.status === filter);

  // 位置照設定的順序（repo 已依 sortOrder 取回），組內依剩餘天數由少到多。
  // 篩選時沒有符合物品的位置整塊隱藏；「有逾期」與置頂也依篩選後顯示的物品判斷（照原型）
  const groups: HomeGroup[] = input.locations
    .map((location) => {
      const groupItems = shown
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
    filter,
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
