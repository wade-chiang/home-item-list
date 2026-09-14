import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import Icon from "../components/Icon.tsx";
import { useToast } from "../components/toastContext.ts";
import { queryKeys } from "../queryKeys.ts";
import { reorderLocations } from "../repo/index.ts";
import type { Location } from "../shared/types.ts";
import { moveItem } from "./placeForm.ts";

// 位置的排序模式（P2-11），版面照 docs/prototype/p0.html 的 reorderRows()，操作改成拖曳（P2-11 確認）。
//
// 拖曳用 @dnd-kit/react（0.x，P2-11 確認）。拖曳相關的程式集中在這個檔案：之後要換套件或 API 有破壞性改版時只改這裡。
// - 只能按住左邊的把手拖，按其他地方照常捲動頁面
// - 觸控預設要按住 250 毫秒才開始拖、移動超過 5px 就取消（套件預設值，@dnd-kit/dom 0.5.0 的 PointerSensor）
// - 沒有限制只能上下拖：限制方向的 modifier 不在 @dnd-kit/react 匯出的範圍，要另外裝 @dnd-kit/abstract
// - 放開就寫入，不跳提示條（原型也沒有）

type Props = {
  locations: readonly Location[];
};

function ReorderRow({
  location,
  index,
}: {
  location: Location;
  index: number;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: location.id,
    index,
  });

  return (
    <div
      ref={ref}
      // 拖曳時 DOM 順序會先變，用 first: 判斷第一列，框線才不會跑掉
      className={`flex items-center gap-2.5 border-t border-line-2 bg-surface px-3 py-2.5 first:border-t-0 ${isDragging ? "relative z-10 shadow-card" : ""}`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`拖曳調整「${location.name}」的順序`}
        // touch-none：按住把手時不要讓瀏覽器捲動頁面
        className="-my-1 grid h-9 w-7 shrink-0 touch-none cursor-grab place-items-center text-ink-3"
      >
        <GripVertical size={18} strokeWidth={1.75} aria-hidden />
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-line-2 text-ink-2">
        <Icon name={location.icon} size={19} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px]">
        {location.name}
      </span>
    </div>
  );
}

function LocationReorderList({ locations }: Props) {
  // 放開後先照新順序顯示，不等重抓，避免跳回舊順序一下
  const [order, setOrder] = useState<readonly Location[] | null>(null);
  const shown = order ?? locations;
  const queryClient = useQueryClient();
  const showToast = useToast();

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source } = event.operation;
        if (event.canceled || !isSortable(source)) {
          return;
        }
        const from = source.initialIndex;
        const to = source.index;
        if (from === to) {
          return;
        }
        const next = moveItem(shown, from, to);
        setOrder(next);
        void reorderLocations(next.map((location) => location.id))
          .then(() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.locations }),
          )
          .catch((error: unknown) => {
            setOrder(null);
            showToast({
              message: `調整順序失敗：${error instanceof Error ? error.message : String(error)}`,
            });
          });
      }}
    >
      {shown.map((location, index) => (
        <ReorderRow key={location.id} location={location} index={index} />
      ))}
    </DragDropProvider>
  );
}

export default LocationReorderList;
