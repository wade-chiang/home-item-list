import { createContext, useContext } from "react";

// 提示條的 context 與 hook。跟 ToastProvider 分開放：同一個檔案同時匯出元件與 hook，
// 會觸發 react/only-export-components（影響開發時的畫面即時更新）。

export type ToastOptions = {
  message: string;
  /** 有值時顯示「復原」按鈕 */
  onUndo?: () => void;
};

export type ShowToast = (options: ToastOptions) => void;

export const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (show === null) {
    throw new Error("useToast 必須在 ToastProvider 裡使用");
  }
  return show;
}
