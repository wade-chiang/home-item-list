import { useCategories, useItems, useLocations, useLogs } from "../queries.ts";
import { getToday } from "../shared/date.ts";
import type { ItemEntriesInput } from "./itemEntries.ts";

export type ItemEntriesDataResult<T> = {
  /** 資料還沒到齊或出錯時為 null */
  data: T | null;
  error: Error | null;
  retry: () => void;
};

/**
 * 首頁與物品頁共用：取回位置、類別、物品、更換紀錄四份資料，到齊後交給 build 組成各頁要的結構。
 * build 丟出的錯誤（例如物品沒有更換紀錄）跟查詢失敗一樣當成錯誤顯示，不讓整頁壞掉。
 */
export function useItemEntriesData<T>(
  build: (input: ItemEntriesInput) => T,
): ItemEntriesDataResult<T> {
  const locations = useLocations();
  const categories = useCategories();
  const items = useItems();
  const logs = useLogs();
  const queries = [locations, categories, items, logs];

  const retry = () => {
    for (const query of queries) {
      void query.refetch();
    }
  };

  const failed = queries.find((query) => query.error !== null);
  if (failed?.error) {
    return { data: null, error: failed.error, retry };
  }

  if (!(locations.data && categories.data && items.data && logs.data)) {
    return { data: null, error: null, retry };
  }

  try {
    // 物品只有幾十筆，每次 render 重算的成本可以忽略
    const data = build({
      locations: locations.data,
      categories: categories.data,
      items: items.data,
      logs: logs.data,
      today: getToday(),
    });
    return { data, error: null, retry };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      retry,
    };
  }
}
