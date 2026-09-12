import { QueryClient } from "@tanstack/react-query";
import { RepoDataError } from "./repo/index.ts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 資料不符合領域型別（RepoDataError）時重試也不會變好，直接顯示錯誤。
      // 其他錯誤（例如 PocketBase 沒開）最多重試 1 次：預設 3 次且間隔加倍，畫面要等好幾秒才看得到錯誤。
      // failureCount 從 0 開始，所以 < 1 就是只重試一次（P1-10 實測）。
      retry: (failureCount, error) =>
        !(error instanceof RepoDataError) && failureCount < 1,
    },
  },
});
