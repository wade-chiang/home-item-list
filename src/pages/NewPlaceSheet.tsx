import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import { INPUT_CLASS, LABEL_CLASS } from "../components/formStyles.ts";
import Icon from "../components/Icon.tsx";
import { useToast } from "../components/toastContext.ts";
import { queryKeys } from "../queryKeys.ts";
import { useCreateCategory, useCreateLocation } from "../queries.ts";
import { deleteCategory, deleteLocation } from "../repo/index.ts";
import type { Category, Location } from "../shared/types.ts";
import {
  DEFAULT_PLACE_ICON,
  nextSortOrder,
  PLACE_WORD,
  type PlaceKind,
  validatePlaceName,
} from "./placeForm.ts";

// 新增位置／類別的面板，版面照 docs/prototype/p0.html 的 openEditPlace()（新增的情況）。
// 這一步不做：icon 選擇與刪除（P2-11）。icon 預覽方塊照原型顯示（P1-15a 確認），P2-11 加上選擇後沿用。

const PLACEHOLDER: Record<PlaceKind, string> = {
  location: "例如 主臥",
  category: "例如 冷氣濾網",
};

type Props = {
  kind: PlaceKind;
  /** 目前的位置或類別，用來檢查重複名稱與決定排序 */
  existing: readonly (Location | Category)[];
  onClose: () => void;
};

function NewPlaceSheet({ kind, existing, onClose }: Props) {
  const word = PLACE_WORD[kind];
  const icon = DEFAULT_PLACE_ICON[kind];
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // hook 不能依條件呼叫，所以兩個都建立，再依種類挑一個用
  const createLocation = useCreateLocation();
  const createCategory = useCreateCategory();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  const isPending = createLocation.isPending || createCategory.isPending;
  const submitError = createLocation.error ?? createCategory.error;

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validatePlaceName(name, kind, existing);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    const place = {
      name: result.name,
      icon,
      sortOrder: nextSortOrder(existing),
    };
    const onSuccess = (created: Location | Category) => {
      showToast({
        message: `已新增${word}「${created.name}」`,
        // 復原＝刪除剛新增的那筆。這段時間內已經有物品用了它時，PocketBase 會拒絕刪除
        onUndo: () => {
          const remove =
            kind === "location"
              ? deleteLocation(created.id as Location["id"])
              : deleteCategory(created.id as Category["id"]);
          void remove
            .then(() =>
              queryClient.invalidateQueries({
                queryKey:
                  kind === "location"
                    ? queryKeys.locations
                    : queryKeys.categories,
              }),
            )
            .catch(() =>
              showToast({
                message: `復原失敗：可能已經有物品用了這個${word}`,
              }),
            );
        },
      });
      onClose();
    };
    if (kind === "location") {
      createLocation.mutate(place, { onSuccess });
    } else {
      createCategory.mutate(place, { onSuccess });
    }
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex items-center justify-between">
          <h3 id={`${id}-title`} className="text-[18px] font-semibold">
            新增{word}
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

        <div className="mt-4 flex items-end gap-3">
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon name={icon} size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor={`${id}-name`} className={LABEL_CLASS}>
              名稱
            </label>
            <input
              id={`${id}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={PLACEHOLDER[kind]}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        {error !== null && (
          <p className="mt-1.5 text-[12.5px] text-overdue">{error}</p>
        )}

        {submitError !== null && (
          <p className="mt-4 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            新增失敗：{submitError.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
        >
          {isPending ? "新增中…" : "新增"}
        </button>
      </form>
    </BottomSheet>
  );
}

export default NewPlaceSheet;
