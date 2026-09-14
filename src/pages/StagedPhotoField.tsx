import { useEffect, useMemo, useState } from "react";
import PhotoViewSheet from "../components/PhotoViewSheet.tsx";
import { PHOTO_VARIANT, type PhotoVariant } from "../components/photoStyles.ts";
import { usePhotoPicker } from "./usePhotoPicker.tsx";

// 新增時暫存的照片格子：紀錄還沒建立，照片先壓縮好放在表單裡，按送出時才跟紀錄一起上傳（P2-3 確認）。
// 版面與已存檔的 PhotoField 相同；刪除只是從表單拿掉，不跳復原提示條（還沒存進資料庫，P2-3 確認）。

type Props = {
  photos: readonly File[];
  onChange: (photos: File[]) => void;
  max: number;
  variant: PhotoVariant;
};

function StagedPhotoField({ photos, onChange, max, variant }: Props) {
  const style = PHOTO_VARIANT[variant];
  const [viewing, setViewing] = useState<number | null>(null);
  const picker = usePhotoPicker((jpeg) => onChange([...photos, jpeg]));

  // 本機預覽網址。照片清單換掉或離開畫面時釋放，避免佔著記憶體
  const urls = useMemo(
    () => photos.map((photo) => URL.createObjectURL(photo)),
    [photos],
  );
  useEffect(
    () => () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    },
    [urls],
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setViewing(index)}
            aria-label="檢視照片"
            className={`grid ${style.tile} place-items-center overflow-hidden rounded-xl border border-line bg-line-2 text-ink-3`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {picker.processing && (
          <span
            aria-label="處理中"
            className={`${style.tile} animate-pulse rounded-xl bg-line-2`}
          />
        )}
        {!picker.processing && photos.length < max && (
          <button
            type="button"
            onClick={picker.open}
            aria-label="新增照片"
            className={`grid ${style.tile} place-items-center rounded-xl border border-dashed border-line ${style.addExtra} text-ink-3`}
          >
            <style.AddIcon
              size={style.iconSize}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        )}
      </div>
      {picker.input}

      {viewing !== null && urls[viewing] !== undefined && (
        <PhotoViewSheet
          title={style.viewTitle}
          src={urls[viewing]}
          deleting={false}
          onDelete={() => {
            onChange(photos.filter((_, index) => index !== viewing));
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

export default StagedPhotoField;
