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
  Purchase,
  PurchaseId,
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
  toPurchase,
  toPurchaseRecord,
  toSettings,
} from "./records.ts";

// 資料存取的唯一入口（CLAUDE.md 紀律 1）。UI 與 src/shared/ 只呼叫這裡的函式，不碰 PocketBase SDK。
// P1-8 只提供核心流程需要的函式；編輯、刪除等寫入跟著 P1-17～P1-19 補上。

export { RepoDataError } from "./records.ts";

/** 新增物品的輸入：id 由 repo 層產生；照片在建立後另外上傳 */
export type NewItem = DistributiveOmit<Item, "id" | "photos">;

/** 新增更換紀錄的輸入：id 由 repo 層產生，所屬物品另外傳入，建立時間由 PocketBase 寫入 */
export type NewLog = DistributiveOmit<
  Log,
  "id" | "itemId" | "createdAt" | "photos"
>;

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
 * 刪除位置（P2-11；P1-15a 起也用在新增後的復原）。還有物品屬於它時 PocketBase 會拒絕，回 400
 * 「Failed to delete record. Make sure that the record is not part of a required relation reference.」
 * （relation 必填且不連帶刪除，P1-5；2026-09-13 實測）。
 */
export async function deleteLocation(id: LocationId): Promise<void> {
  await pb.collection("locations").delete(id);
}

/** 改名與換 icon（P1-19、P2-11）。復原時傳回原本的名稱與 icon */
export async function updateLocation(
  id: LocationId,
  changes: Pick<Location, "name" | "icon">,
): Promise<Location> {
  return toLocation(await pb.collection("locations").update(id, changes));
}

/** 改名與換 icon。規則同 updateLocation */
export async function updateCategory(
  id: CategoryId,
  changes: Pick<Category, "name" | "icon">,
): Promise<Category> {
  return toCategory(await pb.collection("categories").update(id, changes));
}

/** 刪除位置後的「復原」：用原本的 id、名稱、icon、排序建回來（P2-11） */
export async function restoreLocation(location: Location): Promise<void> {
  await pb.collection("locations").create(location);
}

/** 刪除類別後的「復原」，規則同 restoreLocation */
export async function restoreCategory(category: Category): Promise<void> {
  await pb.collection("categories").create(category);
}

/**
 * 位置排序（P2-11）：照傳入的順序把所有位置的 sortOrder 重寫成 0、1、2…，放在同一個 batch。
 * 首頁的位置區塊照這個順序排（有逾期的暫時置頂）
 */
export async function reorderLocations(
  orderedIds: readonly LocationId[],
): Promise<void> {
  const batch = pb.createBatch();
  orderedIds.forEach((id, sortOrder) => {
    batch.collection("locations").update(id, { sortOrder });
  });
  await batch.send();
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

/** 新增採購紀錄的輸入：id 由 repo 層產生 */
export type NewPurchase = Omit<Purchase, "id">;

export async function listPurchases(): Promise<Purchase[]> {
  const records = await pb.collection("purchases").getFullList();
  return records.map(toPurchase);
}

/**
 * 這些採購紀錄裡，除了 logIds 這幾筆更換紀錄以外沒有別人指向的（刪除更換紀錄時才能一起刪，P2-6 確認）。
 * 規格允許一筆採購對應多次更換，目前的畫面只會建立一對一，但仍先查過，避免刪掉別的紀錄還在用的採購
 */
async function purchasesOnlyUsedBy(
  purchaseIds: readonly PurchaseId[],
  logIds: readonly LogId[],
): Promise<PurchaseId[]> {
  const unique = [...new Set(purchaseIds)];
  if (unique.length === 0) {
    return [];
  }
  const expression = unique.map((_, index) => `purchase = {:p${index}}`);
  const params = Object.fromEntries(
    unique.map((id, index) => [`p${index}`, id]),
  );
  const referencing = await pb.collection("logs").getFullList({
    filter: pb.filter(expression.join(" || "), params),
    fields: "id,purchase",
  });
  const usedElsewhere = new Set(
    referencing
      .filter((record) => !logIds.includes(record.id as LogId))
      .map((record) => String(record.purchase)),
  );
  return unique.filter((id) => !usedElsewhere.has(id));
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
 * 照片也放在同一個 batch 上傳（P2-3 確認）：失敗時連照片都不會留下，表單裡的內容保留可以再送一次
 */
export async function createItemWithFirstLog(
  item: NewItem,
  firstLog: NewLog,
  photos: { item: readonly Blob[]; firstLog: readonly Blob[] } = {
    item: [],
    firstLog: [],
  },
  purchase: NewPurchase | null = null,
): Promise<{ item: Item; firstLog: Log }> {
  const itemId = newRecordId() as ItemId;
  const batch = pb.createBatch();
  batch.collection("items").create({
    ...toItemRecord({ ...item, id: itemId }),
    photos: [...photos.item],
  });
  // 新增物品頁的「花費」建立的採購紀錄也在同一個 batch（P2-8）
  const logIndex =
    1 + addLogCreation(batch, itemId, firstLog, photos.firstLog, purchase);
  const results = await batch.send();
  return {
    item: toItem(results[0].body),
    firstLog: toLog(results[logIndex].body),
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
  photos: ItemPhotoBackup = { item: [], logs: new Map() },
  purchases: readonly Purchase[] = [],
): Promise<void> {
  const batch = pb.createBatch();
  // 採購紀錄要先建立，更換紀錄才指得到它（P2-6 確認：刪除時一起刪，復原時一起還原）
  for (const purchase of purchases) {
    batch.collection("purchases").create(toPurchaseRecord(purchase));
  }
  // 照片跟紀錄放在同一個 batch 重新上傳（P2-3 確認）：SDK 看到檔案會改用 multipart，整批仍是單一交易。
  // 檔名會變成新的，內容相同
  batch
    .collection("items")
    .create({ ...toItemRecord(item), photos: [...photos.item] });
  const oldestFirst = logs.toSorted((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  for (const log of oldestFirst) {
    batch.collection("logs").create({
      ...toLogRecord(log),
      photos: [...(photos.logs.get(log.id) ?? [])],
    });
  }
  await batch.send();
}

/** 刪除物品前留下的照片：物品照片，以及每筆更換紀錄的耗材照片 */
export type ItemPhotoBackup = {
  item: readonly Blob[];
  logs: ReadonlyMap<LogId, readonly Blob[]>;
};

/**
 * 刪除物品前先下載所有照片，復原時交給 restoreItemWithLogs 重新上傳（P2-3 確認）。
 * 照片已壓縮過，一張約 200KB；照片多的物品會多等一下
 */
export async function backupItemPhotos(
  item: Item,
  logs: readonly Log[],
): Promise<ItemPhotoBackup> {
  const [itemPhotos, logPhotos] = await Promise.all([
    downloadPhotos({ collection: "items", id: item.id }, item.photos),
    Promise.all(
      logs.map(
        async (log) =>
          [
            log.id,
            await downloadPhotos(
              { collection: "logs", id: log.id },
              log.photos,
            ),
          ] as const,
      ),
    ),
  ]);
  return { item: itemPhotos, logs: new Map(logPhotos) };
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
  photos: readonly Blob[] = [],
  purchase: NewPurchase | null = null,
): Promise<Log> {
  const batch = pb.createBatch();
  const logIndex = addLogCreation(batch, itemId, log, photos, purchase);
  batch.collection("items").update(itemId, { paused: false, pausedUntil: "" });
  const results = await batch.send();
  return toLog(results[logIndex].body);
}

/**
 * 把「建立更換紀錄」加進 batch；這次有買新的就先建立採購紀錄，更換紀錄指向它（P2-6、P2-7）。
 * 採購紀錄的 id 由前端先產生：batch 內拿不到前一個請求建立的 id（CLAUDE.md「PocketBase 有幾個預設值要改」）。
 * 回傳更換紀錄在 batch 結果裡的位置
 */
function addLogCreation(
  batch: ReturnType<typeof pb.createBatch>,
  itemId: ItemId,
  log: NewLog,
  photos: readonly Blob[],
  purchase: NewPurchase | null,
): number {
  let purchaseId = log.purchaseId;
  let index = 0;
  if (purchase !== null) {
    purchaseId = newRecordId() as PurchaseId;
    batch
      .collection("purchases")
      .create(toPurchaseRecord({ ...purchase, id: purchaseId }));
    index = 1;
  }
  batch.collection("logs").create({
    ...toLogRecord({ ...log, purchaseId, id: newRecordId() as LogId, itemId }),
    photos: [...photos],
  });
  return index;
}

/** createLogClearingPause 的「復原」：刪掉剛寫入的紀錄並恢復原本的暫停，放在同一個 batch */
export async function undoLogClearingPause(
  created: Pick<Log, "id" | "itemId" | "purchaseId">,
  previousPause: ItemPause,
): Promise<void> {
  const batch = pb.createBatch();
  batch.collection("logs").delete(created.id);
  // 這次一起建立的採購紀錄也刪掉；它是剛建立的，只有這筆更換紀錄指向它
  if (created.purchaseId !== null) {
    batch.collection("purchases").delete(created.purchaseId);
  }
  batch.collection("items").update(created.itemId, {
    paused: previousPause.paused,
    pausedUntil: previousPause.pausedUntil ?? "",
  });
  await batch.send();
}

/** 照片所在的紀錄：物品照片（最多 5 張）或更換紀錄的耗材照片（最多 2 張） */
export type PhotoTarget =
  { collection: "items"; id: ItemId } | { collection: "logs"; id: LogId };

/**
 * 照片網址。畫面不自己組 PocketBase 的網址：P3 換成手機檔案時只改這裡（CLAUDE.md 紀律 1）。
 * thumb 用 PocketBase 預設就支援的 100x100 縮圖（v0.40.3 `apis/file.go` 的 defaultThumbSizes），不必改 migration（P2-3 確認）
 */
export function photoUrl(
  target: PhotoTarget,
  filename: string,
  size: "thumb" | "full",
): string {
  return pb.files.getURL(
    { collectionName: target.collection, id: target.id },
    filename,
    size === "thumb" ? { thumb: "100x100" } : {},
  );
}

/** 加一張照片。張數上限由 PocketBase 欄位的 maxSelect 把關，超過會回錯誤 */
export async function addPhoto(
  target: PhotoTarget,
  photo: Blob,
): Promise<void> {
  // 欄位名稱加 + 表示附加，不動既有的檔案；SDK 看到 Blob 會自動改用 multipart 送出
  await pb
    .collection(target.collection)
    .update(target.id, { "photos+": photo });
}

/** 刪一張照片。PocketBase 刪掉的檔案救不回來，要能復原得先用 downloadPhoto 留一份 */
export async function removePhoto(
  target: PhotoTarget,
  filename: string,
): Promise<void> {
  // 欄位名稱加 - 表示只移除列出的檔案
  await pb
    .collection(target.collection)
    .update(target.id, { "photos-": [filename] });
}

/** 下載多張原圖，順序與檔名清單相同 */
export function downloadPhotos(
  target: PhotoTarget,
  filenames: readonly string[],
): Promise<Blob[]> {
  return Promise.all(
    filenames.map((filename) => downloadPhoto(target, filename)),
  );
}

/** 下載原圖：刪除照片前留一份，按「復原」時重新上傳（P2-3 確認） */
export async function downloadPhoto(
  target: PhotoTarget,
  filename: string,
): Promise<Blob> {
  const response = await fetch(photoUrl(target, filename, "full"));
  if (!response.ok) {
    throw new Error(`下載照片失敗（HTTP ${response.status}）`);
  }
  // 包成有檔名的 File：重新上傳時 PocketBase 以這個名字當檔名前綴，沒給的話會變成 blob_….jpg
  const blob = await response.blob();
  return new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
}

/** 換好了：為物品寫入一筆更換紀錄 */
export async function createLog(
  itemId: ItemId,
  log: NewLog,
  photos: readonly Blob[] = [],
  purchase: NewPurchase | null = null,
): Promise<Log> {
  // 耗材照片（P2-3）與採購紀錄（P2-7）跟更換紀錄在同一個 batch 建立：任一筆失敗都不會留下
  const batch = pb.createBatch();
  const logIndex = addLogCreation(batch, itemId, log, photos, purchase);
  const results = await batch.send();
  return toLog(results[logIndex].body);
}

/**
 * 刪除物品。PocketBase 會連帶刪除它的更換紀錄（P1-5 的 cascadeDelete）。
 * 新增後的「復原」（P1-14）與刪除物品（P1-17）都用這個函式。
 */
export async function deleteItem(
  id: ItemId,
  logs: readonly Pick<Log, "id" | "purchaseId">[] = [],
): Promise<PurchaseId[]> {
  // 更換紀錄的採購紀錄一起刪（P2-6 確認）。先刪物品（更換紀錄連帶刪除），再刪採購紀錄，放在同一個 batch
  const purchaseIds = await purchasesOnlyUsedBy(
    logs.flatMap((log) => (log.purchaseId === null ? [] : [log.purchaseId])),
    logs.map((log) => log.id),
  );
  const batch = pb.createBatch();
  batch.collection("items").delete(id);
  for (const purchaseId of purchaseIds) {
    batch.collection("purchases").delete(purchaseId);
  }
  await batch.send();
  // 回傳實際刪掉的採購紀錄：復原時只還原這些，還被別人指向而沒刪的不能重建（id 會重複）
  return purchaseIds;
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
  log: Pick<Log, "id" | "itemId" | "purchaseId">,
): Promise<PurchaseId[]> {
  const { totalItems } = await pb.collection("logs").getList(1, 1, {
    filter: pb.filter("item = {:itemId}", { itemId: log.itemId }),
    fields: "id",
  });
  if (totalItems <= 1) {
    throw new LastLogError();
  }
  // 它的採購紀錄沒有別的更換紀錄指向時一起刪（P2-6 確認），放在同一個 batch
  const purchaseIds = await purchasesOnlyUsedBy(
    log.purchaseId === null ? [] : [log.purchaseId],
    [log.id],
  );
  const batch = pb.createBatch();
  batch.collection("logs").delete(log.id);
  for (const purchaseId of purchaseIds) {
    batch.collection("purchases").delete(purchaseId);
  }
  await batch.send();
  // 回傳實際刪掉的採購紀錄，理由同 deleteItem
  return purchaseIds;
}

/**
 * 只改一筆更換紀錄的週期：實際間隔回饋的「把目前週期改成 N 天」（PRODUCT.md §3.5），寫入最近一筆。
 * 復原時傳回原本的週期
 */
export async function updateLogCycle(
  logId: LogId,
  cycleDays: number,
): Promise<Log> {
  return toLog(await pb.collection("logs").update(logId, { cycleDays }));
}

/** 更換紀錄存檔後，採購紀錄變成什麼樣子：復原時交給 revertLogWithPurchase 還原 */
export type SavedLogPurchase = {
  log: Log;
  /** 存檔後這筆指向的採購紀錄 */
  purchase: Purchase | null;
  /** 這次取消勾選而實際刪掉的採購紀錄；還被別的更換紀錄指向而沒刪時是 null */
  deletedPurchaseId: PurchaseId | null;
};

/**
 * 編輯更換紀錄連同「這次有買新的」存檔（P2-8），更換紀錄與採購紀錄的變動放在同一個 batch：
 * - 原本沒有、這次勾了 → 建立採購紀錄並指向它
 * - 原本有、這次也勾 → 直接改原本那筆（P2-8 確認），id 不變
 * - 原本有、這次取消勾選 → 解除關聯；沒有別的更換紀錄指向時刪掉它（P2-8 確認，規則同 deleteLog）
 */
export async function saveLogWithPurchase(
  log: Log,
  before: Purchase | null,
  after: NewPurchase | null,
): Promise<SavedLogPurchase> {
  const batch = pb.createBatch();
  let purchase: Purchase | null = null;
  let deletedPurchaseId: PurchaseId | null = null;

  if (after !== null) {
    purchase = { ...after, id: before?.id ?? (newRecordId() as PurchaseId) };
    if (before === null) {
      batch.collection("purchases").create(toPurchaseRecord(purchase));
    } else {
      const { id, ...body } = toPurchaseRecord(purchase);
      batch.collection("purchases").update(id, body);
    }
  }

  const written: Log = { ...log, purchaseId: purchase?.id ?? null };
  const { id: logId, ...logBody } = toLogRecord(written);
  batch.collection("logs").update(logId, logBody);

  if (after === null && before !== null) {
    const [deletable] = await purchasesOnlyUsedBy([before.id], [log.id]);
    if (deletable !== undefined) {
      // 放在更新更換紀錄之後：先解除關聯再刪
      batch.collection("purchases").delete(deletable);
      deletedPurchaseId = deletable;
    }
  }

  const results = await batch.send();
  const logResult = results[after !== null ? 1 : 0];
  return { log: toLog(logResult.body), purchase, deletedPurchaseId };
}

/**
 * saveLogWithPurchase 的「復原」：更換紀錄改回原本的值，採購紀錄也回到原狀，放在同一個 batch
 */
export async function revertLogWithPurchase(
  original: Log,
  originalPurchase: Purchase | null,
  saved: SavedLogPurchase,
): Promise<void> {
  const batch = pb.createBatch();

  // 原本有、存檔時被刪掉 → 用原本的 id 建回來（要在更換紀錄指向它之前）
  if (
    originalPurchase !== null &&
    saved.deletedPurchaseId === originalPurchase.id
  ) {
    batch.collection("purchases").create(toPurchaseRecord(originalPurchase));
  }
  // 原本有、存檔時改了值 → 改回舊值
  if (originalPurchase !== null && saved.purchase?.id === originalPurchase.id) {
    const { id, ...body } = toPurchaseRecord(originalPurchase);
    batch.collection("purchases").update(id, body);
  }

  const { id: logId, ...logBody } = toLogRecord(original);
  batch.collection("logs").update(logId, logBody);

  // 原本沒有、這次新建的 → 更換紀錄不再指向它之後刪掉
  if (originalPurchase === null && saved.purchase !== null) {
    batch.collection("purchases").delete(saved.purchase.id);
  }

  await batch.send();
}

/**
 * 刪除更換紀錄後的「復原」：用原本的 id 建立回去。
 * 建立時間（autodate）無法寫入，會變成復原當下；只有這筆跟另一筆同一天時，兩筆的先後可能對調
 */
export async function restoreLog(
  log: Log,
  photos: readonly Blob[] = [],
  purchase: Purchase | null = null,
): Promise<void> {
  // 耗材照片（P2-3）與被一起刪掉的採購紀錄（P2-6）跟紀錄放在同一個 batch 還原；照片檔名會變成新的
  const batch = pb.createBatch();
  if (purchase !== null) {
    batch.collection("purchases").create(toPurchaseRecord(purchase));
  }
  batch.collection("logs").create({ ...toLogRecord(log), photos: [...photos] });
  await batch.send();
}

/** 全部資料：匯出備份與還原用（P2-13）。不含手機本機的偏好（外觀、物品 icon 顯示） */
export type AllData = {
  settings: Settings;
  locations: Location[];
  categories: Category[];
  items: Item[];
  logs: Log[];
  purchases: Purchase[];
};

export async function loadAllData(): Promise<AllData> {
  const [settings, locations, categories, items, logs, purchases] =
    await Promise.all([
      getSettings(),
      listLocations(),
      listCategories(),
      listItems(),
      listLogs(),
      listPurchases(),
    ]);
  return { settings, locations, categories, items, logs, purchases };
}

/** 還原需要的 batch 請求數超過上限（migration 1789276263 的 1000）時丟出，資料不會有任何變動 */
export class BackupTooLargeError extends Error {
  readonly requestCount: number;

  constructor(requestCount: number) {
    super(
      `資料量太大，一次還原需要 ${requestCount} 個請求，超過上限 ${BATCH_MAX_REQUESTS}，沒有還原`,
    );
    this.name = "BackupTooLargeError";
    this.requestCount = requestCount;
  }
}

/** batch 一次最多的請求數，要跟 migration 1789276263 的設定一致 */
const BATCH_MAX_REQUESTS = 1000;

/**
 * 用備份取代全部資料（P2-13）。清空與寫回放在同一個 batch，是單一交易：任一步失敗，資料完全不變（P2-13 確認）。
 *
 * - 順序：刪物品（更換紀錄連帶刪除）→ 刪採購、位置、類別 → 建位置、類別、採購 → 建物品（帶照片）→ 建更換紀錄（帶照片）→ 設定
 * - 照片檔名會變成新的，內容相同
 * - 更換紀錄的建立時間（autodate）無法寫入，會變成還原當下；照原本的建立順序由舊到新送出，同一天多筆的先後不保證（同 restoreItemWithLogs）
 * - 交易逾時由 migration 1789450000 調成 30 秒
 */
export async function replaceAllData(
  data: AllData,
  photos: {
    items: ReadonlyMap<ItemId, readonly Blob[]>;
    logs: ReadonlyMap<LogId, readonly Blob[]>;
  },
): Promise<void> {
  const current = await loadAllData();
  const requestCount =
    current.items.length +
    current.purchases.length +
    current.locations.length +
    current.categories.length +
    data.locations.length +
    data.categories.length +
    data.purchases.length +
    data.items.length +
    data.logs.length +
    1;
  if (requestCount > BATCH_MAX_REQUESTS) {
    throw new BackupTooLargeError(requestCount);
  }

  const settingsRow = await pb
    .collection("settings")
    .getFirstListItem(pb.filter("key = {:key}", { key: "defaultLeadDays" }));

  const batch = pb.createBatch();
  for (const item of current.items) {
    batch.collection("items").delete(item.id);
  }
  for (const purchase of current.purchases) {
    batch.collection("purchases").delete(purchase.id);
  }
  for (const location of current.locations) {
    batch.collection("locations").delete(location.id);
  }
  for (const category of current.categories) {
    batch.collection("categories").delete(category.id);
  }

  for (const { id, name, icon, sortOrder } of data.locations) {
    batch.collection("locations").create({ id, name, icon, sortOrder });
  }
  for (const { id, name, icon, sortOrder } of data.categories) {
    batch.collection("categories").create({ id, name, icon, sortOrder });
  }
  for (const purchase of data.purchases) {
    batch.collection("purchases").create(toPurchaseRecord(purchase));
  }
  for (const item of data.items) {
    batch.collection("items").create({
      ...toItemRecord(item),
      photos: [...(photos.items.get(item.id) ?? [])],
    });
  }
  const oldestFirst = data.logs.toSorted((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  for (const log of oldestFirst) {
    batch.collection("logs").create({
      ...toLogRecord(log),
      photos: [...(photos.logs.get(log.id) ?? [])],
    });
  }
  batch
    .collection("settings")
    .update(settingsRow.id, { value: String(data.settings.defaultLeadDays) });

  await batch.send();
}
