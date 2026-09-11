import { z } from "zod";
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
  PurchaseId,
  Settings,
} from "../shared/types.ts";

// PocketBase record 與領域型別之間的轉換（CLAUDE.md 紀律 3）。純函式，不發網路請求，方便單元測試。
// PocketBase 的欄位一律 NOT NULL，沒填時回零值；選填欄位的空字串在這裡轉成 null（CLAUDE.md「型別要自己顧」）。

/** PocketBase 回傳的資料不符合領域型別時丟出。不做靜默修正：錯的資料要被看見 */
export class RepoDataError extends Error {
  readonly collection: string;
  readonly recordId: string;
  readonly detail: string;

  // 不用 constructor 參數直接宣告屬性：tsconfig 開了 erasableSyntaxOnly，那種寫法不允許
  constructor(collection: string, recordId: string, detail: string) {
    super(`${collection} 的紀錄 ${recordId} 不符合領域型別：${detail}`);
    this.name = "RepoDataError";
    this.collection = collection;
    this.recordId = recordId;
    this.detail = detail;
  }
}

function recordIdOf(raw: unknown): string {
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return String(raw.id);
  }
  return "（無 id）";
}

function parse<T>(collection: string, schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new RepoDataError(
      collection,
      recordIdOf(raw),
      z.prettifyError(result.error),
    );
  }
  return result.data;
}

// ---- 欄位 ----

const recordId = z.string().min(1);

const optionalText = z.string().transform((s) => (s === "" ? null : s));

/** z.iso.date() 會檢查每月天數與閏年，擋得住 2026-02-30 */
const isoDate = z.iso.date().transform((s) => s as IsoDate);

const optionalIsoDate = z
  .union([z.literal(""), isoDate])
  .transform((s) => (s === "" ? null : s));

/** PocketBase 的時間戳是 "2026-09-11 15:05:57.302Z"（日期與時間之間是空格），轉成標準 ISO 8601 */
const pbTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .transform((s) => s.replace(" ", "T"));

// ---- 讀進來：PocketBase record → 領域型別 ----

const namedRecord = z.object({
  id: recordId,
  name: z.string().min(1),
  icon: z.string().min(1),
  sortOrder: z.number().int(),
});

export function toLocation(raw: unknown): Location {
  const r = parse("locations", namedRecord, raw);
  return {
    id: r.id as LocationId,
    name: r.name,
    icon: r.icon,
    sortOrder: r.sortOrder,
  };
}

export function toCategory(raw: unknown): Category {
  const r = parse("categories", namedRecord, raw);
  return {
    id: r.id as CategoryId,
    name: r.name,
    icon: r.icon,
    sortOrder: r.sortOrder,
  };
}

const itemRecord = z.object({
  id: recordId,
  location: recordId,
  category: recordId,
  label: optionalText,
  leadDays: z.number().int().min(0),
  note: optionalText,
  paused: z.boolean(),
  pausedUntil: optionalIsoDate,
});

export function toItem(raw: unknown): Item {
  const r = parse("items", itemRecord, raw);
  const base = {
    id: r.id as ItemId,
    locationId: r.location as LocationId,
    categoryId: r.category as CategoryId,
    label: r.label,
    leadDays: r.leadDays,
    note: r.note,
  };
  if (r.paused && r.pausedUntil !== null) {
    return { ...base, paused: true, pausedUntil: r.pausedUntil };
  }
  if (!r.paused && r.pausedUntil === null) {
    return { ...base, paused: false, pausedUntil: null };
  }
  throw new RepoDataError(
    "items",
    r.id,
    r.paused ? "暫停中卻沒有預計恢復日" : "沒有暫停卻有預計恢復日",
  );
}

const logRecord = z.object({
  id: recordId,
  item: recordId,
  replacedOn: optionalIsoDate,
  expectedDue: optionalIsoDate,
  cycleDays: z.number().int().min(1),
  brand: optionalText,
  model: optionalText,
  note: optionalText,
  purchase: optionalText,
  created: pbTimestamp,
});

export function toLog(raw: unknown): Log {
  const r = parse("logs", logRecord, raw);
  const base = {
    id: r.id as LogId,
    itemId: r.item as ItemId,
    cycleDays: r.cycleDays,
    brand: r.brand,
    model: r.model,
    note: r.note,
    purchaseId: r.purchase as PurchaseId | null,
    createdAt: r.created,
  };
  if (r.replacedOn !== null && r.expectedDue === null) {
    return { ...base, replacedOn: r.replacedOn, expectedDue: null };
  }
  if (r.replacedOn === null && r.expectedDue !== null) {
    return { ...base, replacedOn: null, expectedDue: r.expectedDue };
  }
  throw new RepoDataError(
    "logs",
    r.id,
    r.replacedOn !== null
      ? "更換日期與預計到期日同時有值"
      : "更換日期與預計到期日都沒有值",
  );
}

const settingRow = z.object({ key: z.string(), value: z.string() });

/** settings 在 PocketBase 是 key-value 列，組成領域型別的 Settings 物件 */
export function toSettings(rawRows: unknown[]): Settings {
  const rows = rawRows.map((raw) => parse("settings", settingRow, raw));
  const row = rows.find((r) => r.key === "defaultLeadDays");
  if (row === undefined) {
    throw new RepoDataError(
      "settings",
      "defaultLeadDays",
      "找不到這筆設定（應由 P1-5 的 migration 建立）",
    );
  }
  // 不用 Number() 直接轉：Number("") 會得到 0，空值會被當成合法的 0 天
  if (!/^\d+$/.test(row.value)) {
    throw new RepoDataError(
      "settings",
      "defaultLeadDays",
      `值不是非負整數：${JSON.stringify(row.value)}`,
    );
  }
  return { defaultLeadDays: Number(row.value) };
}

// ---- 寫出去：領域型別 → PocketBase record ----

/** 對 union 逐一套用 Omit。一般的 Omit 會把 Item、Log 這種 union 攤平，失去暫停與日期組合的限制 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** PocketBase 存不了 null，寫出時轉回空字串 */
function orEmpty(value: string | null): string {
  return value ?? "";
}

// householdId 是保留欄位（CLAUDE.md「明確不做」多人共用），不寫入，PocketBase 存成空字串
export function toItemRecord(item: Item) {
  return {
    id: item.id,
    location: item.locationId,
    category: item.categoryId,
    label: orEmpty(item.label),
    leadDays: item.leadDays,
    note: orEmpty(item.note),
    paused: item.paused,
    pausedUntil: orEmpty(item.pausedUntil),
  };
}

/** createdAt 由 PocketBase 在建立時寫入，不從前端送出 */
export function toLogRecord(log: DistributiveOmit<Log, "createdAt">) {
  return {
    id: log.id,
    item: log.itemId,
    replacedOn: orEmpty(log.replacedOn),
    expectedDue: orEmpty(log.expectedDue),
    cycleDays: log.cycleDays,
    brand: orEmpty(log.brand),
    model: orEmpty(log.model),
    note: orEmpty(log.note),
    purchase: orEmpty(log.purchaseId),
  };
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 15;

/**
 * 產生 PocketBase 的紀錄 id：15 個 [a-z0-9] 字元，與 PocketBase 自動產生的格式相同。
 * 新增物品時第一筆更換紀錄要在同一個 batch 裡引用物品 id，而 batch 內拿不到前一個請求建立的 id，所以由前端先產生。
 */
export function newRecordId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH))) {
      // 只取小於 252（36 × 7）的值再取餘數，避免各字元出現機率不均
      if (byte < 252 && id.length < ID_LENGTH) {
        id += ID_ALPHABET[byte % ID_ALPHABET.length];
      }
    }
  }
  return id;
}
