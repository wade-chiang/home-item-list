import { type ReactNode, useEffect, useRef } from "react";

type Props = {
  /** 關閉的要求：點背景、按 Esc 或返回鍵。要不要真的關由呼叫端決定（例如送出中不關） */
  onClose: () => void;
  /** 面板標題元素的 id，給螢幕閱讀器念出面板名稱 */
  labelledBy: string;
  children: ReactNode;
};

/**
 * 從底部跳出的面板，照原型的 makeSheet()。掛上就打開，要關閉時由呼叫端把它移除，
 * 所以每次打開都是全新的狀態，不會殘留上一次填到一半的內容。
 *
 * 用原生 <dialog> 的 showModal()（P1-15 確認）：Esc 與 Android 返回鍵會觸發 cancel，
 * 面板開著時後面的頁面不能點、Tab 也不會跑過去，這些不用自己寫。
 */
function BottomSheet({ onClose, labelledBy, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    // StrictMode 開發時 effect 會跑兩次，已經打開時再呼叫 showModal() 在部分瀏覽器會丟錯
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // 不讓瀏覽器自己關掉：關閉一律經過 onClose，呼叫端的狀態才不會跟畫面對不上
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // 內容都包在下面的 div 裡，點擊目標是 dialog 本身時只可能是點在背景上
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      // dialog 預設置中並帶框線與內距，改成貼齊底部；背景色照原型的 --scrim
      className="anim-up mx-auto mb-0 mt-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[20px] border-0 bg-surface p-0 text-ink backdrop:bg-(--scrim)"
    >
      <div
        className="px-[18px] pt-5"
        style={{ paddingBottom: "calc(22px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </dialog>
  );
}

export default BottomSheet;
