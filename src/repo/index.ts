import type {
  Category,
  CategoryId,
  Item,
  ItemId,
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
 * 刪除位置。還有物品屬於它時 PocketBase 會拒絕（relation 必填且不連帶刪除，P1-5）。
 * P1-15a 只用在新增後的「復原」；P2-11 的刪除位置也用這個函式。
 */
export async function deleteLocation(id: LocationId): Promise<void> {
  await pb.collection("locations").delete(id);
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

/** 換好了：為物品寫入一筆更換紀錄 */
export async function createLog(itemId: ItemId, log: NewLog): Promise<Log> {
  const record = await pb
    .collection("logs")
    .create(toLogRecord({ ...log, id: newRecordId() as LogId, itemId }));
  return toLog(record);
}

/**
 * 刪除物品。PocketBase 會連帶刪除它的更換紀錄（P1-5 的 cascadeDelete）。
 * P1-14 先用在新增後的「復原」；P1-17 的刪除物品也用這個函式。
 */
export async function deleteItem(id: ItemId): Promise<void> {
  await pb.collection("items").delete(id);
}

/**
 * 刪除一筆更換紀錄。這裡不檢查「只剩一筆時不能刪」：P1-15 只用在換好了的「復原」，
 * 刪的是剛新增的那筆，原本的紀錄都還在。P1-18 做更換紀錄的刪除時再決定這條規則放在哪一層。
 */
export async function deleteLog(id: LogId): Promise<void> {
  await pb.collection("logs").delete(id);
}
