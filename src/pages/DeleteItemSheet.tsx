import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import { useToast } from "../components/toastContext.ts";
import { useGoBack } from "../navigation.ts";
import { invalidateItemData, useDeleteItem } from "../queries.ts";
import { restoreItemWithLogs } from "../repo/index.ts";
import { displayName } from "../shared/display.ts";
import type { Log } from "../shared/types.ts";
import type { ItemEntry } from "./itemEntries.ts";

// 刪除物品的確認面板，版面照 docs/prototype/p0.html 的 openDeleteItem()（PRODUCT.md §5.5）。
// 這一步不顯示：照片張數與採購價格的說明（P2 才有這些資料）。

type Props = {
  entry: ItemEntry;
  /** 這個物品所有的更換紀錄：顯示筆數，復原時整批寫回 */
  logs: readonly Log[];
  onClose: () => void;
};

function DeleteItemSheet({ entry, logs, onClose }: Props) {
  const { item, location, category } = entry;
  const name = displayName(location.name, category.name, item.label);
  const deleteItem = useDeleteItem();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const goBack = useGoBack();
  const id = useId();

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了換頁、提示條和復原
  const requestClose = () => {
    if (!deleteItem.isPending) {
      onClose();
    }
  };

  const onDelete = () => {
    // 復原時要寫回的資料，刪除前先留一份
    const snapshot = { item, logs: [...logs] };
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        showToast({
          message: `已刪除 ${name}`,
          // 復原＝用原本的 id 把物品與所有更換紀錄建立回去（P1-17 確認）。
          // 更換紀錄 999 筆以內都能復原（batch 上限 1000）；失敗時整批不寫入
          onUndo: () => {
            void restoreItemWithLogs(snapshot.item, snapshot.logs)
              .then(() => invalidateItemData(queryClient))
              .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
          },
        });
        // 回到進詳情頁之前的那一頁（照原型回到來源分頁）。先換頁再重抓，詳情頁才不會閃一下「找不到這個物品」
        goBack("/");
        void invalidateItemData(queryClient);
      },
    });
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-[18px] font-semibold">
        刪除「{name}」？
      </h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
        會一併刪除 <b className="text-ink-2">{logs.length} 筆更換紀錄</b>。
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        如果只是暫時不用，例如冬天的冷氣，可以改用「暫停」。
      </p>
      {deleteItem.error !== null && !deleteItem.isPending && (
        <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          刪除失敗：{deleteItem.error.message}
        </p>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteItem.isPending}
        className="mt-5 w-full rounded-xl bg-overdue py-3.5 text-[15.5px] font-semibold text-surface disabled:opacity-40"
      >
        {deleteItem.isPending ? "刪除中…" : "刪除"}
      </button>
      <button
        type="button"
        onClick={requestClose}
        className="mt-2 w-full py-3 text-[14px] text-ink-3"
      >
        取消
      </button>
    </BottomSheet>
  );
}

export default DeleteItemSheet;
