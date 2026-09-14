import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.ts";
import {
  createCategory,
  createItemWithFirstLog,
  createLocation,
  createLog,
  deleteItem,
  deleteLog,
  getSettings,
  listCategories,
  listItems,
  listLocations,
  listLogs,
  type NewItem,
  type NewLog,
  updateItemWithLatestLog,
  updateLog,
} from "./repo/index.ts";
import type { Item, ItemId, Log } from "./shared/types.ts";

// 各頁共用的查詢：key 與 repo 函式在這裡綁在一起，頁面不用自己記 key。
// 到期日是推導值，不能交給 PocketBase 排序，所以一律整批取回在前端計算（CLAUDE.md）。

export function useLocations() {
  return useQuery({ queryKey: queryKeys.locations, queryFn: listLocations });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: listCategories });
}

export function useItems() {
  return useQuery({ queryKey: queryKeys.items, queryFn: listItems });
}

export function useLogs() {
  return useQuery({ queryKey: queryKeys.logs, queryFn: listLogs });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
}

/** 物品或更換紀錄有變動後呼叫：首頁、物品頁、詳情頁都由這兩份資料組成，兩份一起重抓 */
export async function invalidateItemData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.items }),
    queryClient.invalidateQueries({ queryKey: queryKeys.logs }),
  ]);
}

/** 新增位置：成功後只需重抓位置 */
export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.locations }),
  });
}

/** 新增類別：成功後只需重抓類別 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

/** 換好了：寫入一筆更換紀錄 */
export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, log }: { itemId: ItemId; log: NewLog }) =>
      createLog(itemId, log),
    onSuccess: () => invalidateItemData(queryClient),
  });
}

/** 編輯物品：寫回物品與最近一筆更換紀錄 */
export function useUpdateItemWithLatestLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, latestLog }: { item: Item; latestLog: Log }) =>
      updateItemWithLatestLog(item, latestLog),
    onSuccess: () => invalidateItemData(queryClient),
  });
}

/**
 * 刪除物品。成功後的重抓交給呼叫端，在換頁之後才做：
 * 這裡若先等重抓完成，詳情頁會在換頁前閃一下「找不到這個物品」。
 */
export function useDeleteItem() {
  return useMutation({ mutationFn: deleteItem });
}

/** 編輯更換紀錄：只更新這一筆 */
export function useUpdateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLog,
    onSuccess: () => invalidateItemData(queryClient),
  });
}

/** 刪除一筆更換紀錄。只剩一筆時 repo 層會丟出 LastLogError */
export function useDeleteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLog,
    onSuccess: () => invalidateItemData(queryClient),
  });
}

export function useCreateItemWithFirstLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, firstLog }: { item: NewItem; firstLog: NewLog }) =>
      createItemWithFirstLog(item, firstLog),
    onSuccess: () => invalidateItemData(queryClient),
  });
}
