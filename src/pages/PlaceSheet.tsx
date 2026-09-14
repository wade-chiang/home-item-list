import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import { INPUT_CLASS, LABEL_CLASS } from "../components/formStyles.ts";
import Icon from "../components/Icon.tsx";
import { CATEGORY_ICONS, LOCATION_ICONS } from "../components/placeIcons.ts";
import { useToast } from "../components/toastContext.ts";
import { queryKeys } from "../queryKeys.ts";
import {
  useCreateCategory,
  useCreateLocation,
  useUpdateCategory,
  useUpdateLocation,
} from "../queries.ts";
import {
  deleteCategory,
  deleteLocation,
  restoreCategory,
  restoreLocation,
  updateCategory,
  updateLocation,
} from "../repo/index.ts";
import type { Category, Location } from "../shared/types.ts";
import {
  DEFAULT_PLACE_ICON,
  nextSortOrder,
  PLACE_WORD,
  type PlaceKind,
  validatePlaceName,
} from "./placeForm.ts";

// 新增與編輯位置／類別的面板，版面照 docs/prototype/p0.html 的 openEditPlace()。
// 新增在 P1-15a、改名在 P1-19、icon 自選與刪除在 P2-11。

const PLACEHOLDER: Record<PlaceKind, string> = {
  location: "例如 主臥",
  category: "例如 冷氣濾網",
};

/** icon 精選清單：位置與類別各約 30 個（PRODUCT.md §4.6） */
const ICON_CHOICES: Record<PlaceKind, readonly string[]> = {
  location: LOCATION_ICONS,
  category: CATEGORY_ICONS,
};

type Place = Location | Category;

type Props = {
  kind: PlaceKind;
  /** 目前所有的位置或類別，用來檢查重複名稱與決定排序 */
  existing: readonly Place[];
  /** 要編輯的那一筆；null 表示新增 */
  target: Place | null;
  /** 屬於這個位置或類別的物品數：還有物品時不能刪除（PRODUCT.md §4.6） */
  itemCount: number;
  onClose: () => void;
};

function PlaceSheet({ kind, existing, target, itemCount, onClose }: Props) {
  const word = PLACE_WORD[kind];
  const [name, setName] = useState(target?.name ?? "");
  // 新增時預設 icon 沿用 P1-15a 的 house／package，兩者都在精選清單裡
  const [icon, setIcon] = useState(target?.icon ?? DEFAULT_PLACE_ICON[kind]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // hook 不能依條件呼叫，所以四個都建立，再依種類與新增／編輯挑一個用
  const createLocation = useCreateLocation();
  const createCategory = useCreateCategory();
  const updateLocationMutation = useUpdateLocation();
  const updateCategoryMutation = useUpdateCategory();
  const mutations = [
    createLocation,
    createCategory,
    updateLocationMutation,
    updateCategoryMutation,
  ];
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  const isPending =
    deleting || mutations.some((mutation) => mutation.isPending);
  const submitError =
    mutations.find((mutation) => mutation.error !== null)?.error ?? null;

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const refetchPlaces = () =>
    queryClient.invalidateQueries({
      queryKey:
        kind === "location" ? queryKeys.locations : queryKeys.categories,
    });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 編輯時跟自己同名不算重複
    const others = existing.filter((place) => place.id !== target?.id);
    const result = validatePlaceName(name, kind, others);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);

    if (target === null) {
      const place = {
        name: result.name,
        icon,
        sortOrder: nextSortOrder(existing),
      };
      const onSuccess = (created: Place) => {
        showToast({
          message: `已新增${word}「${created.name}」`,
          // 復原＝刪除剛新增的那筆。這段時間內已經有物品用了它時，PocketBase 會拒絕刪除
          onUndo: () => {
            const remove =
              kind === "location"
                ? deleteLocation(created.id as Location["id"])
                : deleteCategory(created.id as Category["id"]);
            void remove.then(refetchPlaces).catch(() =>
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
      return;
    }

    const previous = { name: target.name, icon: target.icon };
    const onSuccess = (updated: Place) => {
      showToast({
        message: `已更新${word}「${updated.name}」`,
        // 復原＝改回原本的名稱與 icon。面板已經關閉，所以直接呼叫 repo 並自己讓資料重抓
        onUndo: () => {
          const restore =
            kind === "location"
              ? updateLocation(target.id as Location["id"], previous)
              : updateCategory(target.id as Category["id"], previous);
          void restore
            .then(refetchPlaces)
            .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
        },
      });
      onClose();
    };
    if (kind === "location") {
      updateLocationMutation.mutate(
        { id: target.id as Location["id"], name: result.name, icon },
        { onSuccess },
      );
    } else {
      updateCategoryMutation.mutate(
        { id: target.id as Category["id"], name: result.name, icon },
        { onSuccess },
      );
    }
  };

  /** 刪除不跳確認，照原型：用提示條說明並可復原 */
  const onDelete = async () => {
    if (target === null) {
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    try {
      // 還有物品屬於它時 PocketBase 會拒絕（P1-15a 實測），畫面上的物品數是舊的時就會走到這裡
      if (kind === "location") {
        await deleteLocation(target.id as Location["id"]);
      } else {
        await deleteCategory(target.id as Category["id"]);
      }
    } catch (caught) {
      setDeleteError(
        `刪除失敗，可能還有物品在這個${word}：${caught instanceof Error ? caught.message : String(caught)}`,
      );
      return;
    } finally {
      setDeleting(false);
    }
    await refetchPlaces();
    showToast({
      message: `已刪除${word}「${target.name}」`,
      // 復原＝用原本的 id、名稱、icon、排序建回來
      onUndo: () => {
        const restore =
          kind === "location"
            ? restoreLocation(target as Location)
            : restoreCategory(target as Category);
        void restore
          .then(refetchPlaces)
          .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
      },
    });
    onClose();
  };

  const isNew = target === null;

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex items-center justify-between">
          <h3 id={`${id}-title`} className="text-[18px] font-semibold">
            {isNew ? "新增" : "編輯"}
            {word}
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

        <p className={`${LABEL_CLASS} mt-4`}>icon</p>
        <div className="grid grid-cols-6 gap-1.5">
          {ICON_CHOICES[kind].map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={choice}
              aria-pressed={icon === choice}
              onClick={() => setIcon(choice)}
              className={`grid aspect-square place-items-center rounded-xl border ${icon === choice ? "border-accent bg-accent-soft text-accent" : "border-line-2 text-ink-2"}`}
            >
              <Icon name={choice} size={22} />
            </button>
          ))}
        </div>

        {submitError !== null && !isPending && (
          <p className="mt-4 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            {isNew ? "新增" : "儲存"}失敗：{submitError.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
        >
          {isPending && !deleting
            ? isNew
              ? "新增中…"
              : "儲存中…"
            : isNew
              ? "新增"
              : "儲存"}
        </button>
        {!isNew && (
          <>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={itemCount > 0 || isPending}
              className="mt-2 w-full rounded-xl py-3 text-[14px] text-overdue disabled:text-ink-3"
            >
              {deleting ? "刪除中…" : `刪除${word}`}
            </button>
            {itemCount > 0 && (
              <p className="text-center text-[12px] leading-relaxed text-ink-3">
                還有 {itemCount} 個物品在這個{word}，要先移到別的{word}才能刪除
              </p>
            )}
            {deleteError !== null && (
              <p className="mt-1.5 text-center text-[12.5px] leading-relaxed text-overdue">
                {deleteError}
              </p>
            )}
          </>
        )}
      </form>
    </BottomSheet>
  );
}

export default PlaceSheet;
