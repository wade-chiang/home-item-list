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
import { invalidateItemData, useDeleteLog, useUpdateLog } from "../queries.ts";
import { downloadPhotos, restoreLog, updateLog } from "../repo/index.ts";
import { getToday } from "../shared/date.ts";
import { displayName } from "../shared/display.ts";
import { latestLog } from "../shared/due.ts";
import type { Log } from "../shared/types.ts";
import type { ItemEntry } from "./itemEntries.ts";
import {
  buildLogSubmission,
  canDeleteLog,
  describeOutcome,
  initialLogForm,
  type LogFormErrors,
  type LogFormState,
} from "./logForm.ts";
import PhotoField from "./PhotoField.tsx";

// 編輯更換紀錄的面板，版面照 docs/prototype/p0.html 的 openLogEdit()（PRODUCT.md §5.4）。
// 這一步不做：這次有買新的與價格（P2-8）。
// 耗材照片立刻上傳與刪除，不等按儲存（見 PhotoField）。
// 刪除不跳確認：照原型，結果寫在提示條上並可復原。

type Props = {
  entry: ItemEntry;
  /** 這個物品所有的更換紀錄：判斷最近一次、能不能刪、提示條要寫的結果 */
  logs: readonly Log[];
  /** 要編輯的那一筆 */
  log: Log;
  onClose: () => void;
};

function LogEditSheet({ entry, logs, log, onClose }: Props) {
  const { item, location, category } = entry;
  const today = getToday();
  const name = displayName(location.name, category.name, item.label);
  const isLatest = latestLog(logs).id === log.id;
  const deletable = canDeleteLog(logs);

  const [form, setForm] = useState<LogFormState>(() =>
    initialLogForm(log, today),
  );
  const [errors, setErrors] = useState<LogFormErrors>({});
  const update = useUpdateLog();
  const remove = useDeleteLog();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();

  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const isPending = update.isPending || remove.isPending || backingUp;
  const submitError = remove.error ?? update.error;

  const set = <K extends keyof LogFormState>(key: K, value: LogFormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  // 送出中不關閉：面板一移除，mutate 的 onSuccess 就不會執行，會少了提示條和復原
  const requestClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const undoFailed = () => showToast({ message: "復原失敗，請稍後再試" });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildLogSubmission(form, log, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const after = logs.map((other) =>
      other.id === log.id ? result.log : other,
    );
    const outcome = describeOutcome(logs, after, log.id);
    update.mutate(result.log, {
      onSuccess: () => {
        showToast({
          message: outcome === null ? "已儲存更換紀錄" : `已儲存 · ${outcome}`,
          // 復原＝把這筆改回開啟面板時的值。面板已經關閉，所以直接呼叫 repo 並自己讓資料重抓
          onUndo: () => {
            void updateLog(log)
              .then(() => invalidateItemData(queryClient))
              .catch(undoFailed);
          },
        });
        onClose();
      },
    });
  };

  const onDelete = async () => {
    const after = logs.filter((other) => other.id !== log.id);
    const outcome = describeOutcome(logs, after, null);
    // 耗材照片刪了就救不回來，先下載留作復原（P2-3 確認）；下載失敗就不刪
    setBackupError(null);
    setBackingUp(true);
    let photos: Blob[];
    try {
      photos = await downloadPhotos(
        { collection: "logs", id: log.id },
        log.photos,
      );
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error));
      return;
    } finally {
      setBackingUp(false);
    }
    remove.mutate(log, {
      onSuccess: () => {
        showToast({
          message: outcome === null ? "已刪除更換紀錄" : `已刪除 · ${outcome}`,
          // 復原＝用原本的 id 把這筆建立回去
          onUndo: () => {
            void restoreLog(log, photos)
              .then(() => invalidateItemData(queryClient))
              .catch(undoFailed);
          },
        });
        onClose();
      },
    });
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`${id}-title`} className="text-[18px] font-semibold">
              編輯更換紀錄
            </h3>
            <p className="mt-0.5 truncate text-[13.5px] text-ink-3">
              {name}
              {isLatest && " · 最近一次"}
            </p>
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
          {log.replacedOn !== null ? (
            <label htmlFor={`${id}-date`} className={LABEL_CLASS}>
              更換日期
            </label>
          ) : (
            <>
              <p className={LABEL_CLASS}>更換日期</p>
              {/* 日期未記錄的那筆可以補上日期；有日期的不能改回未記錄（照原型） */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("hasDate", false)}
                  className={chipClass(!form.hasDate)}
                >
                  日期未記錄
                </button>
                <button
                  type="button"
                  onClick={() => set("hasDate", true)}
                  className={chipClass(form.hasDate)}
                >
                  補上日期
                </button>
              </div>
            </>
          )}
          {form.hasDate && (
            <input
              id={`${id}-date`}
              type="date"
              aria-label={log.replacedOn === null ? "更換日期" : undefined}
              value={form.date}
              max={today}
              onChange={(event) => set("date", event.target.value)}
              className={`${INPUT_CLASS} ${log.replacedOn === null ? "mt-2" : ""}`}
            />
          )}
          <FieldError message={errors.date} />
        </div>

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

        <div className="mt-3">
          <p className={LABEL_CLASS}>週期</p>
          <CyclePicker
            cycle={form.cycle}
            customCycle={form.customCycle}
            onChange={(next) => {
              setForm((previous) => ({ ...previous, ...next }));
              // 原型點選週期時會收起錯誤訊息
              setErrors(({ cycle: _cycle, ...rest }) => rest);
            }}
          />
          {isLatest && (
            <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">
              這是最近一次，改週期會影響目前的到期日
            </p>
          )}
        </div>

        <div className="mt-3">
          <p className={LABEL_CLASS}>
            耗材照片 <span className="font-normal text-ink-3">最多 2 張</span>
          </p>
          <PhotoField
            target={{ collection: "logs", id: log.id }}
            photos={log.photos}
            max={2}
            variant="log"
          />
        </div>

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
        {backupError !== null && (
          <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            照片備份失敗，沒有刪除：{backupError}
          </p>
        )}
        {submitError !== null && !isPending && (
          <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
            {remove.error !== null ? "刪除失敗" : "儲存失敗"}：
            {submitError.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
        >
          {update.isPending ? "儲存中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={!deletable || isPending}
          className="mt-2 w-full rounded-xl py-3 text-[14px] text-overdue disabled:text-ink-3"
        >
          {remove.isPending || backingUp ? "刪除中…" : "刪除這筆紀錄"}
        </button>
        {!deletable && (
          <p className="text-center text-[12px] leading-relaxed text-ink-3">
            只剩這一筆，不能刪除。每個物品至少要有一筆更換紀錄，到期日才算得出來。
          </p>
        )}
      </form>
    </BottomSheet>
  );
}

export default LogEditSheet;
