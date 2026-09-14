import { useId, useState } from "react";
import { createBackup } from "../backup/backup.ts";
import { backupFileName, backupSummary } from "../backup/format.ts";
import { saveBackupFile } from "../backup/saveFile.ts";
import BottomSheet from "../components/BottomSheet.tsx";
import KeyValueRow from "../components/KeyValueRow.tsx";
import { useToast } from "../components/toastContext.ts";
import { getToday } from "../shared/date.ts";
import type { AllData } from "../repo/index.ts";

// 匯出備份的面板，版面照 docs/prototype/p0.html 的 openExport()（PRODUCT.md §5.7）。

type Props = {
  /** 畫面上已有的資料，只用來顯示數量；實際匯出時重新讀一次全部資料 */
  data: Pick<AllData, "items" | "logs" | "locations" | "categories">;
  onClose: () => void;
};

function ExportBackupSheet({ data, onClose }: Props) {
  const summary = backupSummary(data);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useToast();
  const id = useId();

  const requestClose = () => {
    if (!exporting) {
      onClose();
    }
  };

  const onExport = async () => {
    setError(null);
    setExporting(true);
    try {
      const backup = await createBackup();
      saveBackupFile(backup.filename, backup.bytes);
      showToast({ message: "已匯出備份" });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExporting(false);
    }
  };

  return (
    <BottomSheet onClose={requestClose} labelledBy={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-[18px] font-semibold">
        匯出備份
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
        把所有資料打包成一個檔案，可以存到電腦或雲端硬碟。
      </p>
      <div className="mt-4 rounded-2xl border border-line bg-surface-2 px-4 py-1">
        <KeyValueRow label="物品" value={`${summary.items} 項`} />
        <KeyValueRow label="更換紀錄" value={`${summary.logs} 筆`} />
        <KeyValueRow label="照片" value={`${summary.photos} 張`} />
        <KeyValueRow
          label="位置、類別"
          value={`${summary.locations} 個、${summary.categories} 個`}
        />
      </div>
      <p className="mt-3 font-mono text-[12px] text-ink-3">
        檔名：{backupFileName(getToday())}
      </p>
      {error !== null && (
        <p className="mt-3 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          匯出失敗：{error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void onExport()}
        disabled={exporting}
        className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink disabled:opacity-40"
      >
        {exporting ? "匯出中…" : "匯出"}
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

export default ExportBackupSheet;
