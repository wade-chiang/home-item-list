import { useLocation, useNavigate } from "react-router";

// 從分頁進入子畫面（詳情、新增、編輯）時，用 React Router 的 location state 記住從哪個分頁來：
// 原型在子畫面仍標示原本的分頁。直接輸入網址進來時沒有 state，由 AppLayout 預設標示「物品」。

export type SourceTab = "home" | "items";

export type NavState = { from: SourceTab };

export function sourceTabOf(state: unknown): SourceTab | null {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    (state.from === "home" || state.from === "items")
  ) {
    return state.from;
  }
  return null;
}

/**
 * 回上一頁；直接輸入網址進來、沒有上一頁可回時，改去 fallback。
 * 直接輸入網址進來時 location.key 是 "default"（P1-10 實測）。
 * 返回鍵、編輯存檔後、刪除物品後都用這個，行為才一致。
 */
export function useGoBack(): (fallback: string) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return (fallback) => {
    if (location.key === "default") {
      void navigate(fallback);
    } else {
      void navigate(-1);
    }
  };
}
