import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ToastContext, type ToastOptions } from "./toastContext.ts";

// 原型的 showToast()：一次只顯示一則，5.2 秒後自動消失；有 onUndo 時顯示「復原」。
// 放在路由的版面外層，換頁後提示條仍然看得到（例如新增物品後回到首頁）。

const TOAST_DURATION_MS = 5200;

type ToastState = ToastOptions & { id: number };

/**
 * 提示條要放進哪裡。有底部面板開著時放進最上層的面板裡面：
 * 面板用 <dialog> 的 showModal() 打開，打開期間面板以外的元素都會被瀏覽器設成不可操作（inert），
 * 放在外面的提示條看得到、但「復原」按不下去（P2-3 手機實測，面板裡刪耗材照片後無法復原）。
 */
function toastContainer(): Element {
  let modals: NodeListOf<Element>;
  try {
    modals = document.querySelectorAll("dialog:modal");
  } catch {
    // 不認得 :modal 的舊瀏覽器退回用 open 屬性判斷
    modals = document.querySelectorAll("dialog[open]");
  }
  // 巢狀的面板（例如編輯更換紀錄面板裡的照片檢視）在文件順序上排在後面，最後一個就是最上層
  return modals.length > 0 ? modals[modals.length - 1] : document.body;
}

function ToastView({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 要等畫面更新完才找得到正確的面板：刪照片時「關掉照片檢視」和「顯示提示條」是同一次更新
  const [container, setContainer] = useState<Element | null>(null);

  useLayoutEffect(() => {
    // 這裡的 setState 是刻意的：要讀的是「這次更新完成後」有哪些面板開著，render 當下讀到的還是舊的 DOM
    // oxlint-disable-next-line react/set-state-in-effect
    setContainer(toastContainer());
  }, []);

  // 提示條所在的面板被關掉（從畫面上移除）時，搬到下一個開著的面板或回到頁面上，不跟著面板消失。
  // 刪除物品時提示條先出現在刪除面板裡、接著才換頁把面板移除，沒有這段的話提示條會不見（P2-3 手機實測）
  useEffect(() => {
    if (container === null || container === document.body) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (!container.isConnected) {
        setContainer(toastContainer());
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [container]);

  // 用 popover 放進瀏覽器的 top layer：面板也在 top layer，一般的 fixed 元素再高的 z-index 都會被面板蓋住。
  // top layer 裡後顯示的在上面。不支援 popover 的瀏覽器照舊當成 fixed 元素顯示
  useEffect(() => {
    const element = ref.current;
    if (element !== null && typeof element.showPopover === "function") {
      element.showPopover();
    }
  }, [container]);

  if (container === null) {
    return null;
  }

  return createPortal(
    <div
      ref={ref}
      popover="manual"
      role="status"
      // popover 的瀏覽器預設樣式會置中並加框線、內距與背景，這裡用 top-auto、my-0、border-0 蓋掉
      className="anim-up fixed inset-x-0 top-auto z-50 mx-auto my-0 flex w-[calc(100%-32px)] max-w-[398px] items-center gap-3 rounded-xl border-0 bg-ink px-4 py-3 text-[14px] text-ground shadow-lg"
      style={{ bottom: "calc(92px + env(safe-area-inset-bottom))" }}
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.onUndo !== undefined && (
        <button
          type="button"
          onClick={() => {
            toast.onUndo?.();
            onDismiss();
          }}
          className="whitespace-nowrap font-semibold underline underline-offset-4"
        >
          復原
        </button>
      )}
    </div>,
    container,
  );
}

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
        <ToastView
          // key 換新時重新掛載，連續顯示兩則時進場動畫會重播
          key={toast.id}
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </ToastContext>
  );
}

export default ToastProvider;
