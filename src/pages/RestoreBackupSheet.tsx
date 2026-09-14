import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert, Upload } from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";
import {
  createBackup,
  readBackupFile,
  restoreBackup,
} from "../backup/backup.ts";
import {
  type BackupManifest,
  backupSummary,
  safetyBackupFileName,
} from "../backup/format.ts";
import { saveBackupFile } from "../backup/saveFile.ts";
import BottomSheet from "../components/BottomSheet.tsx";
import KeyValueRow from "../components/KeyValueRow.tsx";
import { useToast } from "../components/toastContext.ts";
import { getToday } from "../shared/date.ts";

// 還原備份的面板，版面照 docs/prototype/p0.html 的 openRestore()（PRODUCT.md §5.7）：
// 第一步警告並選檔，第二步顯示備份內容與影響，確認後覆蓋。
// 按下「覆蓋並還原」會先自動下載一份目前資料的備份，萬一選錯檔還拿得回來（P2-13 確認）。
// 還原是單一交易：失敗時資料完全不變（見 repo 的 replaceAllData）。

type Picked = {
  fileName: string;
  manifest: BackupManifest;
  files: ReadonlyMap<string, Uint8Array>;
};

type Props = {
  /** 目前的物品數，第二步說明影響時用 */
  currentItemCount: number;
  onClose: () => void;
};

function RestoreBackupSheet({ currentItemCount, onClose }: Props) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [reading, setReading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const showToast = useToast();
  const id = useId();
  const busy = reading || restoring;

  const requestClose = () => {
    if (!busy) {
      onClose();
    }
  };

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 清掉選取值：同一個檔案再選一次時才會再觸發 change
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    setError(null);
    setReading(true);
    const result = await readBackupFile(file);
    setReading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPicked({
      fileName: file.name,
      manifest: result.manifest,
      files: result.files,
    });
  };

  const onRestore = async () => {
    if (picked === null) {
      return;
    }
    setError(null);
    setRestoring(true);
    try {
      // 先留一份目前的資料（P2-13 確認）
      const safety = await createBackup();
      saveBackupFile(safetyBackupFileName(getToday()), safety.bytes);
      await restoreBackup(picked.manifest, picked.files);
      // 全部資料都換掉了，所有查詢一起重抓
      await queryClient.invalidateQueries();
      showToast({ message: "已還原備份" });
      onClose();
    } catch (caught) {
      setError(
        `還原失敗，資料沒有變動：${caught instanceof Error ? caught.message : String(caught)}`,
      );
    } finally {
      setRestoring(false);
    }
  };

  const errorBox = error !== null && (
    <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
      {error}
    </p>
  );

  if (picked === null) {
    return (
      <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
        <h3 id={`${id}-title`} className="text-[18px] font-semibold">
          還原備份
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
          選擇之前匯出的備份檔。
        </p>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          <TriangleAlert
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="shrink-0"
          />
          <span>
            還原會用備份檔<b>覆蓋目前所有資料</b>，目前的資料不會保留。
          </span>
        </div>
        {errorBox}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line py-4 text-[14.5px] text-ink-2 disabled:opacity-40"
        >
          <Upload size={18} strokeWidth={1.75} aria-hidden />
          {reading ? "讀取中…" : "選擇備份檔"}
        </button>
        <button
          type="button"
          onClick={requestClose}
          className="mt-2 w-full py-3 text-[14px] text-ink-3"
        >
          取消
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => void onPick(event)}
          hidden
        />
      </BottomSheet>
    );
  }

  const summary = backupSummary(picked.manifest.data);

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-[18px] font-semibold">
        確定要還原嗎？
      </h3>
      <div className="mt-4 rounded-2xl border border-line bg-surface-2 px-4 py-1">
        <KeyValueRow label="檔案" value={picked.fileName} />
        <KeyValueRow label="備份日期" value={picked.manifest.exportedOn} />
        <KeyValueRow
          label="內容"
          value={`物品 ${summary.items} 項、更換紀錄 ${summary.logs} 筆、照片 ${summary.photos} 張`}
        />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        目前有物品 {currentItemCount} 項。還原後會變成備份檔裡的 {summary.items}{" "}
        項，備份之後新增或修改的資料都會消失。
        按下後會先自動下載一份目前資料的備份。
      </p>
      {errorBox}
      <button
        type="button"
        onClick={() => void onRestore()}
        disabled={restoring}
        className="mt-5 w-full rounded-xl bg-overdue py-3.5 text-[15.5px] font-semibold text-surface disabled:opacity-40"
      >
        {restoring ? "還原中…" : "覆蓋並還原"}
      </button>
      <button
        type="button"
        onClick={() => {
          setPicked(null);
          setError(null);
        }}
        disabled={restoring}
        className="mt-2 w-full py-3 text-[14px] text-ink-3"
      >
        重新選擇
      </button>
    </BottomSheet>
  );
}

export default RestoreBackupSheet;
