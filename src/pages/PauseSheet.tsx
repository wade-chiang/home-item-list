import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import FieldError from "../components/FieldError.tsx";
import { INPUT_CLASS } from "../components/formStyles.ts";
import { useToast } from "../components/toastContext.ts";
import { invalidateItemData, useUpdateItemPause } from "../queries.ts";
import { updateItemPause } from "../repo/index.ts";
import { addDays, getToday } from "../shared/date.ts";
import { displayName } from "../shared/display.ts";
import type { ItemEntry } from "./itemEntries.ts";
import {
  buildPause,
  defaultCustomPauseDate,
  type PauseChoice,
  pauseOptionDates,
} from "./pauseForm.ts";

// 暫停的面板，版面照 docs/prototype/p0.html 的 openPause()（PRODUCT.md §5.3）。
// 恢復不跳面板，由詳情頁直接處理（照原型）。

type Props = {
  entry: ItemEntry;
  onClose: () => void;
};

function PauseSheet({ entry, onClose }: Props) {
  const { item, location, category } = entry;
  const today = getToday();
  const name = displayName(location.name, category.name, item.label);
  const dates = pauseOptionDates(today);
  const options: { value: PauseChoice; label: string; date: string }[] = [
    { value: "threeMonths", label: "3 個月後", date: dates.threeMonths },
    // 原型寫「明年 5 月」；改成下一個 5/1，文字跟著改（P2-1 確認）
    { value: "may", label: "5 月 1 日", date: dates.may },
    { value: "custom", label: "指定日期", date: "自己選" },
  ];

  const [choice, setChoice] = useState<PauseChoice | null>(null);
  const [customDate, setCustomDate] = useState<string>(() =>
    defaultCustomPauseDate(today),
  );
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateItemPause();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!update.isPending) {
      onClose();
    }
  };

  const onConfirm = () => {
    const result = buildPause(choice, customDate, today);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    // 復原要寫回的原值。資料庫裡可能是「旗標還在、日期已過」的物品，照原樣還原
    const previous = item.paused
      ? { paused: true as const, pausedUntil: item.pausedUntil }
      : { paused: false as const, pausedUntil: null };
    update.mutate(
      {
        itemId: item.id,
        pause: { paused: true, pausedUntil: result.pausedUntil },
      },
      {
        onSuccess: () => {
          showToast({
            message: `${name} 已暫停`,
            // 復原＝改回暫停前的狀態。面板已經關閉，所以直接呼叫 repo 並自己讓資料重抓
            onUndo: () => {
              void updateItemPause(item.id, previous)
                .then(() => invalidateItemData(queryClient))
                .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
            },
          });
          onClose();
        },
      },
    );
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-[18px] font-semibold">
        暫停「{name}」
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
        暫停期間不計到期、不提醒。
        <b className="text-ink-2">預計恢復日必填</b>
        ——忘了恢復的話，這個 app 會永遠不再提醒你，而且不會有任何異狀。
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={choice === option.value}
            onClick={() => {
              setChoice(option.value);
              setError(null);
            }}
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-[14.5px] ${choice === option.value ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
          >
            <span>{option.label}</span>
            <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">
              {option.date}
            </span>
          </button>
        ))}
      </div>
      {choice === "custom" && (
        <input
          type="date"
          aria-label="預計恢復日"
          value={customDate}
          min={addDays(today, 1)}
          onChange={(event) => setCustomDate(event.target.value)}
          className={`${INPUT_CLASS} mt-2`}
        />
      )}
      {/* 原型在還沒選時常駐顯示這句並停用確定鍵；選了之後的日期錯誤也顯示在這裡 */}
      {choice === null ? (
        <p className="mt-3 text-[12.5px] text-overdue">請先選一個恢復時間</p>
      ) : (
        <FieldError message={error ?? undefined} />
      )}
      {update.error !== null && !update.isPending && (
        <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          暫停失敗：{update.error.message}
        </p>
      )}
      <button
        type="button"
        onClick={onConfirm}
        disabled={choice === null || update.isPending}
        className="mt-4 w-full rounded-xl bg-accent py-3.5 text-[15px] font-semibold text-accent-ink disabled:opacity-40"
      >
        {update.isPending ? "暫停中…" : "確定暫停"}
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

export default PauseSheet;
