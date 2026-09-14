import { z } from "zod";
import type { AllData } from "../repo/index.ts";
import type {
  Category,
  CategoryId,
  IsoDate,
  Item,
  ItemId,
  Location,
  LocationId,
  Log,
  LogId,
  Purchase,
  PurchaseId,
} from "../shared/types.ts";

// 備份檔的格式（P2-13）。純函式，不含 React、不碰 PocketBase，方便單元測試。
//
// 格式是這個 app 自己的領域資料，不綁 PocketBase（P2-13 確認）：P3 換成裝置 SQLite 後，
// 「從 PocketBase 搬到 app」（P3-6）也用這個格式。改格式時要調高 BACKUP_VERSION，並讓舊版本仍讀得進來。
//
// zip 裡的結構：
//   backup.json                     這個檔案定義的 BackupManifest
//   photos/items/<物品 id>/<n>.jpg   物品照片
//   photos/logs/<紀錄 id>/<n>.jpg    耗材照片

export const BACKUP_FORMAT = "home-item-list-backup";
export const BACKUP_VERSION = 1;
export const MANIFEST_PATH = "backup.json";

/**
 * 照片在備份檔裡以 zip 內的路徑表示；還原時再換回 PocketBase 的檔案。
 * 逐一套用在 union 上：一般的 Omit 會把 Item、Log 攤平，失去暫停與日期組合的限制
 */
type WithPhotoPaths<T> = T extends unknown
  ? Omit<T, "photos"> & { photos: string[] }
  : never;

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** 匯出的時間（ISO 8601） */
  exportedAt: string;
  /** 匯出當天（裝置時區），畫面上顯示的「備份日期」 */
  exportedOn: IsoDate;
  data: {
    settings: AllData["settings"];
    locations: Location[];
    categories: Category[];
    items: WithPhotoPaths<Item>[];
    logs: WithPhotoPaths<Log>[];
    purchases: Purchase[];
  };
};

/** 匯出時要放進 zip 的一張照片：來源是哪個紀錄的哪個檔名，放到 zip 裡的哪個路徑 */
export type PhotoEntry = {
  path: string;
  collection: "items" | "logs";
  recordId: string;
  filename: string;
};

export function backupFileName(today: IsoDate): string {
  return `換了沒-備份-${today}.zip`;
}

/** 還原前自動下載的目前資料（P2-13 確認）：檔名跟一般備份分開，才認得出來 */
export function safetyBackupFileName(today: IsoDate): string {
  return `換了沒-還原前自動備份-${today}.zip`;
}

export function buildBackupManifest(
  data: AllData,
  exportedAt: string,
  exportedOn: IsoDate,
): { manifest: BackupManifest; photos: PhotoEntry[] } {
  const photos: PhotoEntry[] = [];
  const toPaths = (
    collection: "items" | "logs",
    recordId: string,
    filenames: readonly string[],
  ) =>
    filenames.map((filename, index) => {
      const path = `photos/${collection}/${recordId}/${index}.jpg`;
      photos.push({ path, collection, recordId, filename });
      return path;
    });

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    exportedOn,
    data: {
      settings: data.settings,
      locations: data.locations,
      categories: data.categories,
      items: data.items.map((item) => ({
        ...item,
        photos: toPaths("items", item.id, item.photos),
      })),
      logs: data.logs.map((log) => ({
        ...log,
        photos: toPaths("logs", log.id, log.photos),
      })),
      purchases: data.purchases,
    },
  };
  return { manifest, photos };
}

// ---- 讀進來：驗證備份檔 ----

/** PocketBase 的紀錄 id：15 個 [a-z0-9] 字元。還原時用原本的 id 建立，格式不對 PocketBase 會拒絕 */
const recordId = z.string().regex(/^[a-z0-9]{15}$/);
const isoDate = z.iso.date().transform((value) => value as IsoDate);
const optionalText = z.string().min(1).nullable();
const photoPaths = z.array(z.string().startsWith("photos/"));

const placeSchema = z.object({
  id: recordId,
  name: z.string().min(1),
  icon: z.string().min(1),
  sortOrder: z.number().int(),
});

const itemSchema = z
  .object({
    id: recordId,
    locationId: recordId,
    categoryId: recordId,
    label: optionalText,
    leadDays: z.number().int().min(0),
    note: optionalText,
    photos: photoPaths.max(5),
  })
  .and(
    z.union([
      z.object({ paused: z.literal(false), pausedUntil: z.null() }),
      z.object({ paused: z.literal(true), pausedUntil: isoDate }),
    ]),
  );

const logSchema = z
  .object({
    id: recordId,
    itemId: recordId,
    cycleDays: z.number().int().min(1),
    brand: optionalText,
    model: optionalText,
    note: optionalText,
    purchaseId: recordId.nullable(),
    createdAt: z.string().min(1),
    photos: photoPaths.max(2),
  })
  .and(
    z.union([
      z.object({ replacedOn: isoDate, expectedDue: z.null() }),
      z.object({ replacedOn: z.null(), expectedDue: isoDate }),
    ]),
  );

const purchaseSchema = z.object({
  id: recordId,
  unitPrice: z.number().int().min(0),
  quantity: z.number().int().min(1),
  unit: optionalText,
  note: optionalText,
});

const manifestSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
  exportedOn: isoDate,
  data: z.object({
    settings: z.object({ defaultLeadDays: z.number().int().min(0) }),
    locations: z.array(placeSchema),
    categories: z.array(placeSchema),
    items: z.array(itemSchema),
    logs: z.array(logSchema),
    purchases: z.array(purchaseSchema),
  }),
});

export type ParsedBackup =
  { ok: true; manifest: BackupManifest } | { ok: false; error: string };

/**
 * 驗證 backup.json。除了欄位格式，也檢查資料之間的關聯：
 * 物品的位置與類別存在、每個物品至少一筆更換紀錄（CLAUDE.md）、紀錄指向的物品與採購存在、照片檔都在 zip 裡。
 * 還原是單一交易，關聯錯了 PocketBase 也會整批拒絕；先在這裡擋下，才說得出錯在哪
 */
export function parseBackupManifest(
  json: unknown,
  filesInZip: ReadonlySet<string>,
): ParsedBackup {
  if (
    typeof json === "object" &&
    json !== null &&
    "format" in json &&
    json.format === BACKUP_FORMAT &&
    "version" in json &&
    typeof json.version === "number" &&
    json.version > BACKUP_VERSION
  ) {
    return {
      ok: false,
      error: `這份備份來自較新版本的 app（格式版本 ${json.version}），請先更新 app`,
    };
  }

  const result = manifestSchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      error: `這不是換了沒的備份檔，或檔案內容有誤：${z.prettifyError(result.error)}`,
    };
  }
  const { data } = result.data;

  const problems: string[] = [];
  const locationIds = new Set(data.locations.map((location) => location.id));
  const categoryIds = new Set(data.categories.map((category) => category.id));
  const itemIds = new Set(data.items.map((item) => item.id));
  const purchaseIds = new Set(data.purchases.map((purchase) => purchase.id));
  const itemsWithLogs = new Set(data.logs.map((log) => log.itemId));

  for (const item of data.items) {
    if (!locationIds.has(item.locationId)) {
      problems.push(`物品 ${item.id} 的位置不存在`);
    }
    if (!categoryIds.has(item.categoryId)) {
      problems.push(`物品 ${item.id} 的類別不存在`);
    }
    if (!itemsWithLogs.has(item.id)) {
      problems.push(`物品 ${item.id} 沒有任何更換紀錄`);
    }
  }
  for (const log of data.logs) {
    if (!itemIds.has(log.itemId)) {
      problems.push(`更換紀錄 ${log.id} 的物品不存在`);
    }
    if (log.purchaseId !== null && !purchaseIds.has(log.purchaseId)) {
      problems.push(`更換紀錄 ${log.id} 的採購紀錄不存在`);
    }
  }
  for (const path of [...data.items, ...data.logs].flatMap((r) => r.photos)) {
    if (!filesInZip.has(path)) {
      problems.push(`缺少照片檔 ${path}`);
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      error: `備份檔的資料不完整：${problems.slice(0, 3).join("；")}${problems.length > 3 ? `（共 ${problems.length} 個問題）` : ""}`,
    };
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: result.data.exportedAt,
    exportedOn: result.data.exportedOn,
    data: {
      settings: data.settings,
      locations: data.locations.map((l) => ({ ...l, id: l.id as LocationId })),
      categories: data.categories.map((c) => ({
        ...c,
        id: c.id as CategoryId,
      })),
      items: data.items.map((item) => ({
        ...item,
        id: item.id as ItemId,
        locationId: item.locationId as LocationId,
        categoryId: item.categoryId as CategoryId,
      })),
      logs: data.logs.map((log) => ({
        ...log,
        id: log.id as LogId,
        itemId: log.itemId as ItemId,
        purchaseId: log.purchaseId as PurchaseId | null,
      })),
      purchases: data.purchases.map((p) => ({ ...p, id: p.id as PurchaseId })),
    },
  };
  return { ok: true, manifest };
}

/** 畫面上顯示的內容數量 */
export function backupSummary(data: {
  items: readonly { photos: readonly string[] }[];
  logs: readonly { photos: readonly string[] }[];
  locations: readonly unknown[];
  categories: readonly unknown[];
}): {
  items: number;
  logs: number;
  photos: number;
  locations: number;
  categories: number;
} {
  return {
    items: data.items.length,
    logs: data.logs.length,
    photos: [...data.items, ...data.logs].reduce(
      (sum, record) => sum + record.photos.length,
      0,
    ),
    locations: data.locations.length,
    categories: data.categories.length,
  };
}
