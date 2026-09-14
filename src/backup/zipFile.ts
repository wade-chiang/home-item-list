import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { MANIFEST_PATH } from "./format.ts";

// 備份檔的 zip 打包與解開（P2-13）。用 fflate（0.x，版本範圍 ^0.8.3），壓縮相關的程式集中在這個檔案：
// 要換套件或 API 有破壞性改版時只改這裡。

/** 不是 zip、或 zip 裡沒有 backup.json 時丟出 */
export class BackupFileError extends Error {
  constructor(detail: string) {
    super(`讀不到這個備份檔：${detail}`);
    this.name = "BackupFileError";
  }
}

/**
 * 打包成 zip。backup.json 用一般壓縮；照片本來就是壓縮過的 JPEG，再壓縮省不了多少空間，所以用 level 0 直接存放
 */
export function packBackup(
  manifestJson: string,
  photos: ReadonlyMap<string, Uint8Array>,
): Uint8Array<ArrayBuffer> {
  const entries: Parameters<typeof zipSync>[0] = {
    [MANIFEST_PATH]: [strToU8(manifestJson), { level: 6 }],
  };
  for (const [path, bytes] of photos) {
    entries[path] = [bytes, { level: 0 }];
  }
  return zipSync(entries);
}

export function unpackBackup(bytes: Uint8Array): {
  json: unknown;
  files: ReadonlyMap<string, Uint8Array>;
} {
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    throw new BackupFileError("不是 zip 檔");
  }
  const manifest = unzipped[MANIFEST_PATH];
  if (manifest === undefined) {
    throw new BackupFileError(`zip 裡沒有 ${MANIFEST_PATH}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(strFromU8(manifest));
  } catch {
    throw new BackupFileError(`${MANIFEST_PATH} 不是正確的 JSON`);
  }
  const files = new Map(
    Object.entries(unzipped).filter(([path]) => path !== MANIFEST_PATH),
  );
  return { json, files };
}
