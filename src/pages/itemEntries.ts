import { calcDue, calcStatus, daysUntilDue, latestLog } from "../shared/due.ts";
import type {
  Category,
  IsoDate,
  Item,
  ItemStatus,
  Location,
  Log,
} from "../shared/types.ts";

// 把物品、位置、類別、更換紀錄組起來，並算出到期資訊。首頁與物品頁共用這一份，避免兩頁各寫一套而不一致。
// 到期日與狀態一律呼叫 src/shared/due.ts，不在這裡重算（CLAUDE.md「到期日是推導值」）。

export type ItemEntry = {
  item: Item;
  location: Location;
  category: Category;
  latestLog: Log;
  due: IsoDate;
  daysLeft: number;
  status: ItemStatus;
};

export type ItemEntriesInput = {
  locations: readonly Location[];
  categories: readonly Category[];
  items: readonly Item[];
  logs: readonly Log[];
  today: IsoDate;
};

/**
 * 每個物品一筆，包含暫停中的物品（要不要顯示由各頁決定）。
 * 找不到位置、找不到類別、沒有更換紀錄時丟出錯誤：都是資料的不變條件，要被看見，不默默略過。
 */
export function buildItemEntries({
  locations,
  categories,
  items,
  logs,
  today,
}: ItemEntriesInput): ItemEntry[] {
  const logsByItem = new Map<Item["id"], Log[]>();
  for (const log of logs) {
    const existing = logsByItem.get(log.itemId);
    if (existing === undefined) {
      logsByItem.set(log.itemId, [log]);
    } else {
      existing.push(log);
    }
  }

  const locationById = new Map(
    locations.map((location) => [location.id, location]),
  );
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return items.map((item) => {
    const location = locationById.get(item.locationId);
    if (location === undefined) {
      throw new Error(`物品 ${item.id} 找不到位置 ${item.locationId}`);
    }
    const category = categoryById.get(item.categoryId);
    if (category === undefined) {
      throw new Error(`物品 ${item.id} 找不到類別 ${item.categoryId}`);
    }
    // 沒有更換紀錄時 latestLog 與 calcDue 會丟出錯誤
    const itemLogs = logsByItem.get(item.id) ?? [];
    const due = calcDue(itemLogs);
    return {
      item,
      location,
      category,
      latestLog: latestLog(itemLogs),
      due,
      daysLeft: daysUntilDue(due, today),
      status: calcStatus(item, due, today),
    };
  });
}
