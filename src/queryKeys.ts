import type { ItemId } from "./shared/types.ts";

// TanStack Query 的 key 集中定義：新增或修改資料後要讓相關查詢重抓，key 分散在各頁容易漏。
// 讓 key 有共同前綴：invalidateQueries({ queryKey: queryKeys.logs }) 會連 logsByItem 一起重抓。
export const queryKeys = {
  locations: ["locations"] as const,
  categories: ["categories"] as const,
  items: ["items"] as const,
  item: (id: ItemId) => ["items", id] as const,
  logs: ["logs"] as const,
  logsByItem: (itemId: ItemId) => ["logs", { itemId }] as const,
  purchases: ["purchases"] as const,
  settings: ["settings"] as const,
};
