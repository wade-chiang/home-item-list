import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import CyclePicker from "../components/CyclePicker.tsx";
import FieldError from "../components/FieldError.tsx";
import {
  chipClass,
  INPUT_CLASS,
  LABEL_CLASS,
} from "../components/formStyles.ts";
import { useToast } from "../components/toastContext.ts";
import {
  invalidateItemData,
  useCreateLog,
  useCreateLogClearingPause,
} from "../queries.ts";
import { deleteLog, undoLogClearingPause } from "../repo/index.ts";
import { getToday } from "../shared/date.ts";
import { displayName } from "../shared/display.ts";
import {
  becomesLatest,
  BRAND_MODEL_HINT_TEXT,
  brandModelHint,
  buildDoneSubmission,
  type DoneDate,
  type DoneFormErrors,
  type DoneFormState,
  initialDoneForm,
  isSameCycle,
} from "./doneForm.ts";
import type { ItemEntry } from "./itemEntries.ts";
import PackagePhotoButton from "./PackagePhotoButton.tsx";

// 換好了確認面板，首頁與物品詳情頁共用。版面照 docs/prototype/p0.html 的 openDone()。
// 這一步不做：這次有買新的（P2-7）。
// 「加耗材包裝照片」選好的照片暫存在面板，按確認時跟更換紀錄一起上傳（P2-3 確認）。
// 暫停中的物品按換好了會同時取消暫停（PRODUCT.md §5.1，P2-1）。

const DATE_OPTIONS: { value: DoneDate; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "other", label: "其他日期" },
];

type Props = {
  /** 按下換好了當下的物品資料。面板開著時資料重抓，也照這份的「上一次」預填與比較 */
  entry: ItemEntry;
  onClose: () => void;
};

function DoneSheet({ entry, onClose }: Props) {
  const { item, location, category, latestLog: previousLatest } = entry;
  const today = getToday();
  const name = displayName(location.name, category.name, item.label);

  const [form, setForm] = useState<DoneFormState>(() =>
    initialDoneForm(previousLatest, today),
  );
  const [errors, setErrors] = useState<DoneFormErrors>({});
  // 資料庫裡還標著暫停的物品（含日期已過、推導上已恢復的），寫入紀錄時一併清掉旗標
  const clearsPause = item.paused;
  const plainCreate = useCreateLog();
  const pauseClearingCreate = useCreateLogClearingPause();
  const createLog = clearsPause ? pauseClearingCreate : plainCreate;
  const [packagePhoto, setPackagePhoto] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  const set = <K extends keyof DoneFormState>(
    key: K,
    value: DoneFormState[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!createLog.isPending) {
      onClose();
    }
  };

  const hint = brandModelHint(form, previousLatest);
  const sameCycle = isSameCycle(form, previousLatest);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildDoneSubmission(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    createLog.mutate(
      {
        itemId: item.id,
        log: result.log,
        photos: packagePhoto === null ? [] : [packagePhoto],
      },
      {
        onSuccess: (created) => {
          showToast({
            // 日期早於最近一次時，歷史照日期排進中間、到期日不變，要講清楚（PRODUCT.md §5.1）
            message: becomesLatest(previousLatest, created)
              ? `${name} 已記錄`
              : "已記錄 · 日期早於上次更換，到期日沒有變",
            // 復原＝刪掉剛寫入的那筆；原本是暫停中的話，暫停也一起還原。
            // 面板已經關閉，所以直接呼叫 repo 並自己讓資料重抓
            onUndo: () => {
              const undo = item.paused
                ? undoLogClearingPause(created, {
                    paused: true,
                    pausedUntil: item.pausedUntil,
                  })
                : deleteLog(created);
              void undo
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
      <form onSubmit={onSubmit} noValidate>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`${id}-title`} className="text-[18px] font-semibold">
              換好了
            </h3>
            <p className="mt-0.5 truncate text-[13.5px] text-ink-3">{name}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="關閉"
            className="-mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="mt-4">
          <p className={LABEL_CLASS}>更換日期</p>
          <div className="flex gap-2">
            {DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set("date", option.value)}
                className={chipClass(form.date === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {form.date === "other" && (
            <>
              <input
                type="date"
                aria-label="更換日期"
                value={form.otherDate}
                max={today}
                onChange={(event) => set("otherDate", event.target.value)}
                className={`${INPUT_CLASS} mt-2`}
              />
              <FieldError message={errors.otherDate} />
            </>
          )}
        </div>

        <PackagePhotoButton
          photo={packagePhoto}
          onChange={setPackagePhoto}
          variant="inline"
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-brand`} className={LABEL_CLASS}>
              品牌
            </label>
            <input
              id={`${id}-brand`}
              value={form.brand}
              onChange={(event) => set("brand", event.target.value)}
              placeholder="選填"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${id}-model`} className={LABEL_CLASS}>
              型號
            </label>
            <input
              id={`${id}-model`}
              value={form.model}
              onChange={(event) => set("model", event.target.value)}
              placeholder="選填"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <p
          className={`mt-1.5 font-mono text-[11.5px] ${hint === "changed" ? "text-soon" : "text-ink-3"}`}
        >
          {BRAND_MODEL_HINT_TEXT[hint]}
        </p>

        <div className="mt-3">
          <p className={LABEL_CLASS}>週期</p>
          <CyclePicker
            cycle={form.cycle}
            customCycle={form.customCycle}
            onChange={(next) => {
              setForm((previous) => ({ ...previous, ...next }));
              // 原型點選週期時會收起「請填週期天數」
              setErrors(({ cycle: _cycle, ...rest }) => rest);
            }}
          />
          <p
            className={`mt-1.5 font-mono text-[11.5px] ${sameCycle ? "text-ink-3" : "text-soon"}`}
          >
            {sameCycle
              ? "沿用上次"
              : `與上次不同（上次 ${previousLatest.cycleDays} 天）`}
          </p>
        </div>

        {/* 備註記在這次的更換紀錄上（PRODUCT.md §5.1） */}
        <div className="mt-3">
          <label htmlFor={`${id}-note`} className={LABEL_CLASS}>
            備註
          </label>
          <textarea
            id={`${id}-note`}
            rows={2}
            value={form.note}
            onChange={(event) => set("note", event.target.value)}
            placeholder="選填，例如購買通路、這次的狀況…"
            className={`${INPUT_CLASS} leading-relaxed`}
          />
        </div>

        {errors.cycle !== undefined && (
          <p className="mt-3 text-[13px] text-overdue">{errors.cycle}</p>
        )}
        {createLog.error !== null && (
          <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            記錄失敗：{createLog.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={createLog.isPending}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
        >
          {createLog.isPending ? "記錄中…" : "確認"}
        </button>
      </form>
    </BottomSheet>
  );
}

export default DoneSheet;
