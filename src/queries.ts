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
  createLogClearingPause,
  deleteItem,
  deleteLog,
  getSettings,
  listCategories,
  listItems,
  listLocations,
  listLogs,
  listPurchases,
  type NewItem,
  type NewLog,
  type NewPurchase,
  saveLogWithPurchase,
  updateCategory,
  updateDefaultLeadDays,
  updateItemPause,
  updateItemWithLatestLog,
  updateLocation,
} from "./repo/index.ts";
import type {
  CategoryId,
  Item,
  ItemId,
  ItemPause,
  LocationId,
  Log,
  Purchase,
} from "./shared/types.ts";

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

export function usePurchases() {
  return useQuery({ queryKey: queryKeys.purchases, queryFn: listPurchases });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
}

/**
 * 物品或更換紀錄有變動後呼叫：首頁、物品頁、詳情頁都由這些資料組成，一起重抓。
 * 採購紀錄跟著更換紀錄建立與刪除（P2-6），所以也一起重抓
 */
export async function invalidateItemData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.items }),
    queryClient.invalidateQueries({ queryKey: queryKeys.logs }),
    queryClient.invalidateQueries({ queryKey: queryKeys.purchases }),
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

/** 改名位置：成功後重抓位置 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: LocationId; name: string }) =>
      updateLocation(id, { name }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.locations }),
  });
}

/** 改名類別：成功後重抓類別 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: CategoryId; name: string }) =>
      updateCategory(id, { name }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

/** 新物品預設提前提醒：成功後重抓設定 */
export function useUpdateDefaultLeadDays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDefaultLeadDays,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

/** 暫停或恢復物品 */
export function useUpdateItemPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, pause }: { itemId: ItemId; pause: ItemPause }) =>
      updateItemPause(itemId, pause),
    onSuccess: () => invalidateItemData(queryClient),
  });
}

/** 換好了：暫停中的物品寫入更換紀錄並取消暫停 */
export function useCreateLogClearingPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      log,
      photos,
      purchase,
    }: {
      itemId: ItemId;
      log: NewLog;
      photos: readonly Blob[];
      purchase: NewPurchase | null;
    }) => createLogClearingPause(itemId, log, photos, purchase),
    onSuccess: () => invalidateItemData(queryClient),
  });
}

/** 換好了：寫入一筆更換紀錄 */
export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      log,
      photos,
      purchase,
    }: {
      itemId: ItemId;
      log: NewLog;
      photos: readonly Blob[];
      purchase: NewPurchase | null;
    }) => createLog(itemId, log, photos, purchase),
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
  return useMutation({
    mutationFn: ({
      id,
      logs,
    }: {
      id: ItemId;
      /** 用來一起刪除它們的採購紀錄（P2-6） */
      logs: readonly Pick<Log, "id" | "purchaseId">[];
    }) => deleteItem(id, logs),
  });
}

/** 編輯更換紀錄：連同「這次有買新的」的採購紀錄一起存（P2-8） */
export function useSaveLogWithPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      log,
      before,
      after,
    }: {
      log: Log;
      before: Purchase | null;
      after: NewPurchase | null;
    }) => saveLogWithPurchase(log, before, after),
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
    mutationFn: ({
      item,
      firstLog,
      photos,
      purchase,
    }: {
      item: NewItem;
      firstLog: NewLog;
      photos: { item: readonly Blob[]; firstLog: readonly Blob[] };
      purchase: NewPurchase | null;
    }) => createItemWithFirstLog(item, firstLog, photos, purchase),
    onSuccess: () => invalidateItemData(queryClient),
  });
}
