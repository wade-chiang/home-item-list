import { calcDue, calcStatus, daysUntilDue, latestLog } from "../shared/due.ts";
import type {
  Category,
  IsoDate,
  Item,
  ItemStatus,
  Location,
  Log,
} from "../shared/types.ts";

// 首頁的分組與統計。純函式，不含 React，方便單元測試。
// 到期日與狀態一律呼叫 src/shared/due.ts，不在這裡重算（CLAUDE.md「到期日是推導值」）。

/** 首頁一列需要的資料：物品本身加上推導出來的到期資訊 */
export type HomeItem = {
  item: Item;
  category: Category;
  latestLog: Log;
  due: IsoDate;
  daysLeft: number;
  status: ItemStatus;
};

export type HomeGroup = {
  location: Location;
  items: HomeItem[];
  hasOverdue: boolean;
};

export type HomeCounts = { overdue: number; soon: number; ok: number };

export type HomeData = {
  groups: HomeGroup[];
  counts: HomeCounts;
  /** 沒有暫停的物品總數，用來分辨「還沒有任何物品」與「有物品但都被暫停」 */
  activeCount: number;
};

export type HomeInput = {
  locations: readonly Location[];
  categories: readonly Category[];
  items: readonly Item[];
  logs: readonly Log[];
  today: IsoDate;
};

export function buildHomeData({
  locations,
  categories,
  items,
  logs,
  today,
}: HomeInput): HomeData {
  const logsByItem = new Map<Item["id"], Log[]>();
  for (const log of logs) {
    const existing = logsByItem.get(log.itemId);
    if (existing === undefined) {
      logsByItem.set(log.itemId, [log]);
    } else {
      existing.push(log);
    }
  }

  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  // 暫停的物品不出現在位置區塊（PRODUCT.md §3.2）。P2-2 會在首頁最下方常駐顯示「N 項已暫停」
  const active = items.filter((item) => !item.paused);

  const homeItems: HomeItem[] = active.map((item) => {
    const category = categoryById.get(item.categoryId);
    if (category === undefined) {
      throw new Error(`物品 ${item.id} 找不到類別 ${item.categoryId}`);
    }
    // 物品沒有更換紀錄時，latestLog 與 calcDue 會丟出錯誤：這是資料的不變條件，要被看見而不是默默略過
    const itemLogs = logsByItem.get(item.id) ?? [];
    const due = calcDue(itemLogs);
    return {
      item,
      category,
      latestLog: latestLog(itemLogs),
      due,
      daysLeft: daysUntilDue(due, today),
      status: calcStatus(item, due, today),
    };
  });

  const counts: HomeCounts = {
    overdue: homeItems.filter((entry) => entry.status === "overdue").length,
    soon: homeItems.filter((entry) => entry.status === "soon").length,
    ok: homeItems.filter((entry) => entry.status === "ok").length,
  };

  // 位置照設定的順序（repo 已依 sortOrder 取回），組內依剩餘天數由少到多
  const groups: HomeGroup[] = locations
    .map((location) => {
      const groupItems = homeItems
        .filter((entry) => entry.item.locationId === location.id)
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
