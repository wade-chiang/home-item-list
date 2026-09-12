import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.ts";
import {
  listCategories,
  listItems,
  listLocations,
  listLogs,
} from "./repo/index.ts";

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
