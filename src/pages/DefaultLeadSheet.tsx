import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import FieldError from "../components/FieldError.tsx";
import { chipClass, INPUT_CLASS } from "../components/formStyles.ts";
import { useToast } from "../components/toastContext.ts";
import { queryKeys } from "../queryKeys.ts";
import { useUpdateDefaultLeadDays } from "../queries.ts";
import { updateDefaultLeadDays } from "../repo/index.ts";
import { parseNonNegativeInteger } from "./formValues.ts";

// 新物品預設提前提醒的面板，版面照 docs/prototype/p0.html 的 openLeadSetting()（PRODUCT.md §4.6）。

/** 快速選項（照原型） */
const LEAD_PRESETS = [3, 7, 14, 30];

type Props = {
  current: number;
  onClose: () => void;
};

function DefaultLeadSheet({ current, onClose }: Props) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateDefaultLeadDays();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!update.isPending) {
      onClose();
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 0 是合法值（到期當天才提醒）。原型遇到不合法的值直接不動作，這裡改成提示原因
    const days = parseNonNegativeInteger(value);
    if (days === null) {
      setError("請填 0 以上的整數");
      return;
    }
    setError(null);
    update.mutate(days, {
      onSuccess: () => {
        showToast({
          message: `新物品預設提前提醒改為 ${days} 天`,
          // 復原＝改回原本的天數。面板已經關閉，所以直接呼叫 repo 並自己讓資料重抓
          onUndo: () => {
            void updateDefaultLeadDays(current)
              .then(() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
              )
              .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
          },
        });
        onClose();
      },
    });
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <form onSubmit={onSubmit} noValidate>
        <h3 id={`${id}-title`} className="text-[18px] font-semibold">
          新物品預設提前提醒
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
          新增物品時會帶入這個天數。
          <b className="text-ink-2">已經建立的物品不會改變</b>
          ，要改請到各物品的編輯頁。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LEAD_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setValue(String(days));
                setError(null);
              }}
              className={chipClass(value === String(days), true)}
            >
              {days} 天
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label="提前提醒天數"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={`${INPUT_CLASS} w-24`}
          />
          <span className="whitespace-nowrap text-[14px] text-ink-2">
            天前開始提醒
          </span>
        </div>
        <FieldError message={error ?? undefined} />

        {update.error !== null && !update.isPending && (
          <p className="mt-4 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            儲存失敗：{update.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={update.isPending}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
        >
          {update.isPending ? "儲存中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={requestClose}
          className="mt-2 w-full py-3 text-[14px] text-ink-3"
        >
          取消
        </button>
      </form>
    </BottomSheet>
  );
}

export default DefaultLeadSheet;
