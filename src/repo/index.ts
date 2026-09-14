import type {
  Category,
  CategoryId,
  Item,
  ItemId,
  ItemPause,
  Location,
  LocationId,
  Log,
  LogId,
  Settings,
} from "../shared/types.ts";
import { pb } from "./client.ts";
import {
  type DistributiveOmit,
  newRecordId,
  toCategory,
  toItem,
  toItemRecord,
  toLocation,
  toLog,
  toLogRecord,
  toSettings,
} from "./records.ts";

// 資料存取的唯一入口（CLAUDE.md 紀律 1）。UI 與 src/shared/ 只呼叫這裡的函式，不碰 PocketBase SDK。
// P1-8 只提供核心流程需要的函式；編輯、刪除等寫入跟著 P1-17～P1-19 補上。

export { RepoDataError } from "./records.ts";

/** 新增物品的輸入：id 由 repo 層產生 */
export type NewItem = DistributiveOmit<Item, "id">;

/** 新增更換紀錄的輸入：id 由 repo 層產生，所屬物品另外傳入，建立時間由 PocketBase 寫入 */
export type NewLog = DistributiveOmit<Log, "id" | "itemId" | "createdAt">;

export async function listLocations(): Promise<Location[]> {
  // sortOrder 是存下來的欄位，可以交給 PocketBase 排序；依到期日排序才必須在前端做（CLAUDE.md）
  const records = await pb
    .collection("locations")
    .getFullList({ sort: "sortOrder" });
  return records.map(toLocation);
}

export async function listCategories(): Promise<Category[]> {
  const records = await pb
    .collection("categories")
    .getFullList({ sort: "sortOrder" });
  return records.map(toCategory);
}

/** 新增位置或類別的輸入：id 由 PocketBase 產生 */
export type NewPlace = Pick<Location, "name" | "icon" | "sortOrder">;

// 位置、類別的欄位名稱與領域型別相同，也沒有選填欄位要轉換，所以直接送出。householdId 不寫（CLAUDE.md「明確不做」）
export async function createLocation(place: NewPlace): Promise<Location> {
  return toLocation(await pb.collection("locations").create(place));
}

export async function createCategory(place: NewPlace): Promise<Category> {
  return toCategory(await pb.collection("categories").create(place));
}

/**
 * 刪除位置。還有物品屬於它時 PocketBase 會拒絕，回 400
 * 「Failed to delete record. Make sure that the record is not part of a required relation reference.」
 * （relation 必填且不連帶刪除，P1-5；2026-09-13 實測）。
 * P1-15a 只用在新增後的「復原」；P2-11 的刪除位置也用這個函式。
 */
export async function deleteLocation(id: LocationId): Promise<void> {
  await pb.collection("locations").delete(id);
}

/** 改名位置。icon 自選在 P2-11，這裡只改名稱 */
export async function updateLocation(
  id: LocationId,
  changes: Pick<Location, "name">,
): Promise<Location> {
  return toLocation(await pb.collection("locations").update(id, changes));
}

/** 改名類別。規則同 updateLocation */
export async function updateCategory(
  id: CategoryId,
  changes: Pick<Category, "name">,
): Promise<Category> {
  return toCategory(await pb.collection("categories").update(id, changes));
}

/** 刪除類別。規則同 deleteLocation */
export async function deleteCategory(id: CategoryId): Promise<void> {
  await pb.collection("categories").delete(id);
}

export async function listItems(): Promise<Item[]> {
  const records = await pb.collection("items").getFullList();
  return records.map(toItem);
}

export async function getItem(id: ItemId): Promise<Item> {
  return toItem(await pb.collection("items").getOne(id));
}

export async function listLogs(): Promise<Log[]> {
  const records = await pb.collection("logs").getFullList();
  return records.map(toLog);
}

export async function listLogsByItem(itemId: ItemId): Promise<Log[]> {
  const records = await pb.collection("logs").getFullList({
    // pb.filter 會跳脫參數，避免把 id 直接拼進查詢字串
    filter: pb.filter("item = {:itemId}", { itemId }),
  });
  return records.map(toLog);
}

export async function getSettings(): Promise<Settings> {
  return toSettings(await pb.collection("settings").getFullList());
}

/**
 * 新物品預設提前提醒。settings 是 key-value 列，這筆由 P1-5 的 migration 建立。
 * 只影響之後新增的物品，已建立的物品不變（PRODUCT.md §4.6）
 */
export async function updateDefaultLeadDays(days: number): Promise<void> {
  const row = await pb
    .collection("settings")
    .getFirstListItem(pb.filter("key = {:key}", { key: "defaultLeadDays" }));
  await pb.collection("settings").update(row.id, { value: String(days) });
}

/**
 * 新增物品並同時寫入第一筆更換紀錄（CLAUDE.md「每個物品至少一筆更換紀錄」）。
 * 兩筆放在同一個 batch，PocketBase 以單一交易執行：任一筆失敗，兩筆都不會留下。
 */
export async function createItemWithFirstLog(
  item: NewItem,
  firstLog: NewLog,
): Promise<{ item: Item; firstLog: Log }> {
  const itemId = newRecordId() as ItemId;
  const batch = pb.createBatch();
  batch.collection("items").create(toItemRecord({ ...item, id: itemId }));
  batch
    .collection("logs")
    .create(toLogRecord({ ...firstLog, id: newRecordId() as LogId, itemId }));
  const [itemResult, logResult] = await batch.send();
  return {
    item: toItem(itemResult.body),
    firstLog: toLog(logResult.body),
  };
}

/**
 * 編輯物品：物品與最近一筆更換紀錄放在同一個 batch，任一筆失敗兩筆都不會改（PRODUCT.md §4.5）。
 * 存檔後的「復原」也用這個函式，把兩筆改回編輯前的值。
 */
export async function updateItemWithLatestLog(
  item: Item,
  latestLog: Log,
): Promise<{ item: Item; latestLog: Log }> {
  // id 放在網址上，不放進內容；建立時間由 PocketBase 管理，不送出
  const { id: itemId, ...itemBody } = toItemRecord(item);
  const { id: logId, ...logBody } = toLogRecord(latestLog);
  const batch = pb.createBatch();
  batch.collection("items").update(itemId, itemBody);
  batch.collection("logs").update(logId, logBody);
  const [itemResult, logResult] = await batch.send();
  return {
    item: toItem(itemResult.body),
    latestLog: toLog(logResult.body),
  };
}

/**
 * 刪除物品後的「復原」：用原本的 id，把物品和它所有的更換紀錄放在同一個 batch 建立回去。
 *
 * - batch 上限調成 1000（migration 1789276263），更換紀錄 999 筆以內都能復原；超過時 PocketBase 會拒絕，整批不寫入
 * - 更換紀錄的建立時間（createdAt）是 PocketBase 的 autodate，無法寫入，會變成復原當下。
 *   依原本的建立順序由舊到新送出，盡量維持「同一天多筆時較晚建立的較新」，但時間可能相同，先後不保證
 */
export async function restoreItemWithLogs(
  item: Item,
  logs: readonly Log[],
): Promise<void> {
  const batch = pb.createBatch();
  batch.collection("items").create(toItemRecord(item));
  const oldestFirst = logs.toSorted((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  for (const log of oldestFirst) {
    batch.collection("logs").create(toLogRecord(log));
  }
  await batch.send();
}

/**
 * 暫停或恢復：只改 paused 與 pausedUntil（P2-1）。恢復時傳 { paused: false, pausedUntil: null }。
 * 暫停與恢復後的「復原」也用這個函式，傳回原本的值
 */
export async function updateItemPause(
  itemId: ItemId,
  pause: ItemPause,
): Promise<Item> {
  const record = await pb.collection("items").update(itemId, {
    paused: pause.paused,
    // PocketBase 存不了 null，沒有暫停時存空字串（CLAUDE.md「型別要自己顧」）
    pausedUntil: pause.pausedUntil ?? "",
  });
  return toItem(record);
}

/**
 * 暫停中的物品按「換好了」：寫入更換紀錄並取消暫停，放在同一個 batch（PRODUCT.md §5.1）。
 * 「暫停中」看的是資料庫的 paused 旗標：日期已過、推導上已恢復的物品也順便清掉旗標
 */
export async function createLogClearingPause(
  itemId: ItemId,
  log: NewLog,
): Promise<Log> {
  const batch = pb.createBatch();
  batch
    .collection("logs")
    .create(toLogRecord({ ...log, id: newRecordId() as LogId, itemId }));
  batch.collection("items").update(itemId, { paused: false, pausedUntil: "" });
  const [logResult] = await batch.send();
  return toLog(logResult.body);
}

/** createLogClearingPause 的「復原」：刪掉剛寫入的紀錄並恢復原本的暫停，放在同一個 batch */
export async function undoLogClearingPause(
  created: Pick<Log, "id" | "itemId">,
  previousPause: ItemPause,
): Promise<void> {
  const batch = pb.createBatch();
  batch.collection("logs").delete(created.id);
  batch.collection("items").update(created.itemId, {
    paused: previousPause.paused,
    pausedUntil: previousPause.pausedUntil ?? "",
  });
  await batch.send();
}

/** 換好了：為物品寫入一筆更換紀錄 */
export async function createLog(itemId: ItemId, log: NewLog): Promise<Log> {
  const record = await pb
    .collection("logs")
    .create(toLogRecord({ ...log, id: newRecordId() as LogId, itemId }));
  return toLog(record);
}

/**
 * 刪除物品。PocketBase 會連帶刪除它的更換紀錄（P1-5 的 cascadeDelete）。
 * 新增後的「復原」（P1-14）與刪除物品（P1-17）都用這個函式。
 */
export async function deleteItem(id: ItemId): Promise<void> {
  await pb.collection("items").delete(id);
}

/** 刪除更換紀錄時，這個物品只剩這一筆。畫面上已經停用刪除鍵，這是 repo 層的第二道把關 */
export class LastLogError extends Error {
  constructor() {
    super(
      "只剩這一筆，不能刪除。每個物品至少要有一筆更換紀錄，到期日才算得出來。",
    );
    this.name = "LastLogError";
  }
}

/**
 * 刪除一筆更換紀錄。「每個物品至少一筆更換紀錄」（CLAUDE.md）在這裡把關（P1-18 決定）：
 * 刪除前先查這個物品還有幾筆，只剩一筆就丟出 LastLogError。
 * 先查再刪是兩個請求、不是原子操作；單人使用不會同時刪同一個物品的兩筆紀錄，所以夠用。
 * 換好了之後的「復原」（P1-15）與編輯面板的刪除（P1-18）都用這個函式。
 */
export async function deleteLog(
  log: Pick<Log, "id" | "itemId">,
): Promise<void> {
  const { totalItems } = await pb.collection("logs").getList(1, 1, {
    filter: pb.filter("item = {:itemId}", { itemId: log.itemId }),
    fields: "id",
  });
  if (totalItems <= 1) {
    throw new LastLogError();
  }
  await pb.collection("logs").delete(log.id);
}

/** 編輯更換紀錄：只更新這一筆。存檔後的「復原」也用這個函式，把它改回原本的值 */
export async function updateLog(log: Log): Promise<Log> {
  // id 放在網址上，不放進內容；建立時間由 PocketBase 管理，不送出
  const { id, ...body } = toLogRecord(log);
  return toLog(await pb.collection("logs").update(id, body));
}

/**
 * 刪除更換紀錄後的「復原」：用原本的 id 建立回去。
 * 建立時間（autodate）無法寫入，會變成復原當下；只有這筆跟另一筆同一天時，兩筆的先後可能對調
 */
export async function restoreLog(log: Log): Promise<void> {
  await pb.collection("logs").create(toLogRecord(log));
}
