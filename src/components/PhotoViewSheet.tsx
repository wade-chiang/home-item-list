import { Trash, X } from "lucide-react";
import { useId } from "react";
import BottomSheet from "./BottomSheet.tsx";

type Props = {
  title: string;
  /** 原圖網址 */
  src: string;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
};

/** 檢視一張照片並可刪除。版面照 docs/prototype/p0.html 的 openPhotoView() */
function PhotoViewSheet({ title, src, deleting, onDelete, onClose }: Props) {
  const id = useId();

  // 刪除中不關閉：刪除要先下載原圖留作復原，關掉的話提示條與復原會不見
  const requestClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <div className="flex items-center justify-between">
        <h3 id={`${id}-title`} className="text-[17px] font-semibold">
          {title}
        </h3>
        <button
          type="button"
          onClick={requestClose}
          aria-label="關閉"
          className="-mr-1.5 grid h-9 w-9 place-items-center rounded-lg text-ink-3"
        >
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {/* 原型是 4:3 的灰色佔位；實際照片用 object-contain 完整顯示，不裁切 */}
      <div className="mt-3 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-line-2">
        <img src={src} alt={title} className="h-full w-full object-contain" />
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-[14.5px] text-overdue disabled:opacity-40"
      >
        <Trash size={17} strokeWidth={1.75} aria-hidden />
        {deleting ? "刪除中…" : "刪除這張照片"}
      </button>
    </BottomSheet>
  );
}

export default PhotoViewSheet;
