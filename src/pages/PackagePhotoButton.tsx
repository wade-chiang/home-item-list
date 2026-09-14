import { ImagePlus } from "lucide-react";
import { usePhotoPicker } from "./usePhotoPicker.tsx";

// 「加耗材包裝照片」按鈕：新增物品頁與換好了面板共用，選好的照片存成這次更換紀錄的耗材照片。
// 原型是「拍耗材包裝」並自動填入品牌型號；P2 只存照片、不自動填入（自動填入在 P4-1），
// 而且開的是相簿不是相機（PRODUCT.md §4.4、§5.6），所以文字與 icon 都不用「拍」（P2-3 確認）。
// 選好後照原型只改文字，不顯示縮圖（P2-3 確認）；再按一次換成新選的照片。

type Props = {
  photo: File | null;
  onChange: (photo: File) => void;
  /** 新增物品頁是大卡片加副標，換好了面板是一行按鈕（照原型） */
  variant: "card" | "inline";
};

function PackagePhotoButton({ photo, onChange, variant }: Props) {
  const picker = usePhotoPicker(onChange);
  const label = picker.processing
    ? "處理中…"
    : photo === null
      ? "加耗材包裝照片"
      : "已加耗材包裝照片 · 重選";

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={picker.open}
          disabled={picker.processing}
          className="mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-accent bg-accent-soft px-4 py-4 text-accent disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-[15.5px] font-medium">
            <ImagePlus size={20} strokeWidth={1.75} aria-hidden />
            {label}
          </span>
          <span className="text-[12px]">從相簿選，存成這次的耗材照片</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={picker.open}
          disabled={picker.processing}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-accent bg-accent-soft py-3 text-[14.5px] font-medium text-accent disabled:opacity-60"
        >
          <ImagePlus size={19} strokeWidth={1.75} aria-hidden />
          {label}
        </button>
      )}
      {picker.input}
    </>
  );
}

export default PackagePhotoButton;
