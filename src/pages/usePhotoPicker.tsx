import { type ChangeEvent, type ReactNode, useRef, useState } from "react";
import { useToast } from "../components/toastContext.ts";
import { toCompressedJpeg } from "../photoFile.ts";

// 從相簿選一張照片並壓縮成 JPEG。照片格子、新增物品頁、換好了面板共用。
//
// P2 只開相簿，不帶 capture 直接開相機：網頁版開相機時瀏覽器在背景被系統回收，照片送不回網頁
// （2026-09-14 Xperia 5 V 的 Vivaldi 與 Chrome 實測，PRODUCT.md §5.6）。P3 改用 Capacitor 相機外掛時加回拍照。

export type PhotoPicker = {
  /** 打開相簿 */
  open: () => void;
  /** 隱藏的 <input type="file">，要放進畫面裡 */
  input: ReactNode;
  /** 壓縮中 */
  processing: boolean;
};

export function usePhotoPicker(onPicked: (jpeg: File) => void): PhotoPicker {
  const ref = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const showToast = useToast();

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 清掉選取值：同一張照片再選一次時才會再觸發 change
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    setProcessing(true);
    void toCompressedJpeg(file)
      .then(onPicked)
      .catch((error: unknown) =>
        showToast({
          message: error instanceof Error ? error.message : String(error),
        }),
      )
      .finally(() => setProcessing(false));
  };

  return {
    open: () => ref.current?.click(),
    input: (
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={onChange}
        hidden
      />
    ),
    processing,
  };
}
