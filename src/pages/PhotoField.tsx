import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import PhotoViewSheet from "../components/PhotoViewSheet.tsx";
import { PHOTO_VARIANT, type PhotoVariant } from "../components/photoStyles.ts";
import { useToast } from "../components/toastContext.ts";
import { invalidateItemData } from "../queries.ts";
import {
  addPhoto,
  downloadPhoto,
  type PhotoTarget,
  photoUrl,
  removePhoto,
} from "../repo/index.ts";
import { usePhotoPicker } from "./usePhotoPicker.tsx";

// 已存檔的物品或更換紀錄上的照片格子：縮圖、加號、點照片檢視與刪除。
// 版面照原型的物品照片與耗材照片區塊（PRODUCT.md §5.6）。按加號開相簿，理由見 usePhotoPicker。
// 照片立刻上傳、立刻刪除，不等外層表單按儲存：跟原型不同，原型的編輯面板是按儲存才生效。
// 每個動作各自有提示條；刪除可以復原（先下載原圖，復原時重新上傳，P2-3 確認）。
// 新增時紀錄還沒建立、沒地方上傳，改用 StagedPhotoField。

type Props = {
  target: PhotoTarget;
  /** 目前的照片檔名，來自重抓後的資料 */
  photos: readonly string[];
  /** 張數上限：物品 5、更換紀錄 2。滿了加號就消失 */
  max: number;
  variant: PhotoVariant;
};

function PhotoField({ target, photos, max, variant }: Props) {
  const style = PHOTO_VARIANT[variant];
  // 正在檢視的照片檔名；null 表示沒開
  const [viewing, setViewing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const showToast = useToast();

  const refetch = () => invalidateItemData(queryClient);
  const messageOf = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const picker = usePhotoPicker((jpeg) => {
    setUploading(true);
    void addPhoto(target, jpeg)
      .then(refetch)
      .then(() => showToast({ message: "已加入照片" }))
      .catch((error: unknown) =>
        showToast({ message: `加入照片失敗：${messageOf(error)}` }),
      )
      .finally(() => setUploading(false));
  });
  const busy = picker.processing || uploading;

  const onDelete = (filename: string) => {
    setDeleting(true);
    void (async () => {
      try {
        // 先留一份原圖：PocketBase 刪掉的檔案救不回來
        const backup = await downloadPhoto(target, filename);
        await removePhoto(target, filename);
        await refetch();
        setViewing(null);
        showToast({
          message: "已刪除照片",
          // 復原＝重新上傳留下的原圖。檔名會變、排到最後，內容相同
          onUndo: () => {
            void addPhoto(target, backup)
              .then(refetch)
              .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
          },
        });
      } catch (error) {
        showToast({ message: `刪除照片失敗：${messageOf(error)}` });
      } finally {
        setDeleting(false);
      }
    })();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map((filename) => (
          <button
            key={filename}
            type="button"
            onClick={() => setViewing(filename)}
            aria-label="檢視照片"
            className={`grid ${style.tile} place-items-center overflow-hidden rounded-xl border border-line bg-line-2 text-ink-3`}
          >
            <img
              src={photoUrl(target, filename, "thumb")}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
        {busy && (
          <span
            aria-label="處理中"
            className={`${style.tile} animate-pulse rounded-xl bg-line-2`}
          />
        )}
        {!busy && photos.length < max && (
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

      {viewing !== null && (
        <PhotoViewSheet
          title={style.viewTitle}
          src={photoUrl(target, viewing, "full")}
          deleting={deleting}
          onDelete={() => onDelete(viewing)}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

export default PhotoField;
