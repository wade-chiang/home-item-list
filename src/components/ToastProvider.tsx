import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ToastContext, type ToastOptions } from "./toastContext.ts";

// 原型的 showToast()：一次只顯示一則，5.2 秒後自動消失；有 onUndo 時顯示「復原」。
// 放在路由的版面外層，換頁後提示條仍然看得到（例如新增物品後回到首頁）。

const TOAST_DURATION_MS = 5200;

type ToastState = ToastOptions & { id: number };

function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      {toast !== null && (
        <div
          // key 換新時重新掛載，連續顯示兩則時進場動畫會重播
          key={toast.id}
          role="status"
          className="anim-up fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-32px)] max-w-[398px] items-center gap-3 rounded-xl bg-ink px-4 py-3 text-[14px] text-ground shadow-lg"
          style={{ bottom: "calc(92px + env(safe-area-inset-bottom))" }}
        >
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.onUndo !== undefined && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="whitespace-nowrap font-semibold underline underline-offset-4"
            >
              復原
            </button>
          )}
        </div>
      )}
    </ToastContext>
  );
}

export default ToastProvider;
