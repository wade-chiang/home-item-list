import { downloadPhoto, loadAllData, replaceAllData } from "../repo/index.ts";
import { getToday } from "../shared/date.ts";
import type { ItemId, LogId } from "../shared/types.ts";
import {
  backupFileName,
  type BackupManifest,
  buildBackupManifest,
  parseBackupManifest,
  type ParsedBackup,
} from "./format.ts";
import { packBackup, unpackBackup } from "./zipFile.ts";

// 匯出與還原的流程（P2-13）。資料只經過 repo 層（P2-13 確認）：P3 換成裝置 SQLite 時只改 repo，這裡不用動。

/** 讀出全部資料與照片，打包成 zip */
export async function createBackup(): Promise<{
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
}> {
  const data = await loadAllData();
  const today = getToday();
  const { manifest, photos } = buildBackupManifest(
    data,
    new Date().toISOString(),
    today,
  );
  const photoBytes = new Map(
    await Promise.all(
      photos.map(
        async (photo) =>
          [
            photo.path,
            new Uint8Array(
              await (
                await downloadPhoto(
                  photo.collection === "items"
                    ? { collection: "items", id: photo.recordId as ItemId }
                    : { collection: "logs", id: photo.recordId as LogId },
                  photo.filename,
                )
              ).arrayBuffer(),
            ),
          ] as const,
      ),
    ),
  );
  return {
    filename: backupFileName(today),
    bytes: packBackup(JSON.stringify(manifest), photoBytes),
  };
}

export type ReadBackup =
  | {
      ok: true;
      manifest: BackupManifest;
      files: ReadonlyMap<string, Uint8Array>;
    }
  | { ok: false; error: string };

/** 讀使用者選的檔案並驗證，還不寫入任何資料 */
export async function readBackupFile(file: Blob): Promise<ReadBackup> {
  let unpacked: ReturnType<typeof unpackBackup>;
  try {
    unpacked = unpackBackup(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const parsed: ParsedBackup = parseBackupManifest(
    unpacked.json,
    new Set(unpacked.files.keys()),
  );
  return parsed.ok
    ? { ok: true, manifest: parsed.manifest, files: unpacked.files }
    : parsed;
}

/** 用備份取代全部資料。單一交易，失敗時資料完全不變（見 repo 的 replaceAllData） */
export async function restoreBackup(
  manifest: BackupManifest,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<void> {
  const toBlobs = (paths: readonly string[]) =>
    paths.map((path) => {
      const bytes = files.get(path);
      if (bytes === undefined) {
        // parseBackupManifest 已檢查過，走到這裡代表程式有錯
        throw new Error(`缺少照片檔 ${path}`);
      }
      return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
    });

  const { data } = manifest;
  await replaceAllData(
    {
      settings: data.settings,
      locations: data.locations,
      categories: data.categories,
      purchases: data.purchases,
      // 領域型別的 photos 是 PocketBase 的檔名；還原時照片另外帶上，這裡先放空的
      items: data.items.map((item) => ({ ...item, photos: [] })),
      logs: data.logs.map((log) => ({ ...log, photos: [] })),
    },
    {
      items: new Map(
        data.items.map((item) => [item.id, toBlobs(item.photos)] as const),
      ),
      logs: new Map(
        data.logs.map((log) => [log.id, toBlobs(log.photos)] as const),
      ),
    },
  );
}
