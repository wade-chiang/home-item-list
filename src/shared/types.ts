// 領域型別（手寫維護）。src/shared/ 與 UI 只認這些型別，不認 PocketBase 的 record。
// 與 pb_migrations/ 的 schema 之間沒有編譯器把關，改欄位時兩邊要一起改（CLAUDE.md「型別要自己顧」）。
// 選填欄位沒填時一律是 null，不用空字串；定案後不要改回空字串，理由見 CLAUDE.md。

/** YYYY-MM-DD 純日期字串，時區 Asia/Taipei（CLAUDE.md「日期只存日期」）。只能由 repo 層驗證後產生。 */
export type IsoDate = string & { readonly __brand: "IsoDate" };

// 各 collection 的 id 分開成不同型別：Item 同時引用位置與類別，避免兩者互相填錯。
export type LocationId = string & { readonly __brand: "LocationId" };
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type ItemId = string & { readonly __brand: "ItemId" };
export type LogId = string & { readonly __brand: "LogId" };
export type PurchaseId = string & { readonly __brand: "PurchaseId" };

export type Location = {
  id: LocationId;
  name: string;
  /** Lucide icon 名稱 */
  icon: string;
  sortOrder: number;
};

export type Category = {
  id: CategoryId;
  name: string;
  /** Lucide icon 名稱。物品沿用類別的 icon */
  icon: string;
  sortOrder: number;
};

/** 暫停時必須有預計恢復日（CLAUDE.md「暫停會靜默失效」），用型別排除「暫停但沒有恢復日」 */
type ItemPause =
  { paused: false; pausedUntil: null } | { paused: true; pausedUntil: IsoDate };

export type Item = {
  id: ItemId;
  locationId: LocationId;
  categoryId: CategoryId;
  /** 補充名稱 */
  label: string | null;
  /** 提前提醒天數。可以是 0：到期當天才提醒 */
  leadDays: number;
  note: string | null;
} & ItemPause;

/** 日期未記錄時才有預計到期日；補上日期時清掉（PRODUCT.md §2），用型別排除兩者皆有或皆無 */
type LogDate =
  | { replacedOn: IsoDate; expectedDue: null }
  | { replacedOn: null; expectedDue: IsoDate };

export type Log = {
  id: LogId;
  itemId: ItemId;
  cycleDays: number;
  brand: string | null;
  model: string | null;
  note: string | null;
  /** 空 = 這次用既有存貨 */
  purchaseId: PurchaseId | null;
  /** ISO 8601 UTC 時間戳。只用於「同一天較晚建立的為較新」 */
  createdAt: string;
} & LogDate;

export type Purchase = {
  id: PurchaseId;
  /** 元，整數。0 表示贈品 */
  unitPrice: number;
  quantity: number;
  unit: string | null;
  note: string | null;
};

/** PocketBase 存成 key-value 列，repo 層組成這個物件 */
export type Settings = {
  defaultLeadDays: number;
};

/** 推導值，由 src/shared/due.ts 計算，不是欄位 */
export type ItemStatus = "ok" | "soon" | "overdue" | "paused";
