import { describe, expect, it } from "vitest";
import type { AllData } from "../repo/index.ts";
import type {
  CategoryId,
  IsoDate,
  ItemId,
  LocationId,
  LogId,
  PurchaseId,
} from "../shared/types.ts";
import {
  backupFileName,
  backupSummary,
  buildBackupManifest,
  parseBackupManifest,
} from "./format.ts";
import { packBackup, unpackBackup } from "./zipFile.ts";

const id = (value: string) => value.padEnd(15, "0");

const data: AllData = {
  settings: { defaultLeadDays: 7 },
  locations: [
    {
      id: id("loc") as LocationId,
      name: "主臥",
      icon: "bed-double",
      sortOrder: 0,
    },
  ],
  categories: [
    {
      id: id("cat") as CategoryId,
      name: "冷氣濾網",
      icon: "air-vent",
      sortOrder: 0,
    },
  ],
  items: [
    {
      id: id("item") as ItemId,
      locationId: id("loc") as LocationId,
      categoryId: id("cat") as CategoryId,
      label: null,
      leadDays: 7,
      note: null,
      photos: ["a_123.jpg"],
      paused: false,
      pausedUntil: null,
    },
  ],
  logs: [
    {
      id: id("log") as LogId,
      itemId: id("item") as ItemId,
      cycleDays: 90,
      brand: "3M",
      model: null,
      note: null,
      purchaseId: id("pur") as PurchaseId,
      createdAt: "2026-09-01T10:00:00.000Z",
      photos: ["b_1.jpg", "c_2.jpg"],
      replacedOn: "2026-09-01" as IsoDate,
      expectedDue: null,
    },
  ],
  purchases: [
    {
      id: id("pur") as PurchaseId,
      unitPrice: 400,
      quantity: 1,
      unit: "捲",
      note: null,
    },
  ],
};

function roundTrip(json: unknown, paths: string[]) {
  return parseBackupManifest(json, new Set(paths));
}

describe("buildBackupManifest", () => {
  it("照片換成 zip 內的路徑，並列出要下載的照片", () => {
    const { manifest, photos } = buildBackupManifest(
      data,
      "2026-09-15T01:00:00.000Z",
      "2026-09-15" as IsoDate,
    );
    expect(manifest.data.items[0].photos).toEqual([
      "photos/items/item00000000000/0.jpg",
    ]);
    expect(photos).toHaveLength(3);
    expect(photos[1]).toEqual({
      path: "photos/logs/log000000000000/0.jpg",
      collection: "logs",
      recordId: "log000000000000",
      filename: "b_1.jpg",
    });
  });
});

describe("parseBackupManifest", () => {
  const { manifest, photos } = buildBackupManifest(
    data,
    "2026-09-15T01:00:00.000Z",
    "2026-09-15" as IsoDate,
  );
  const paths = photos.map((photo) => photo.path);
  const json = JSON.parse(JSON.stringify(manifest)) as unknown;

  it("匯出的內容讀得回來", () => {
    const parsed = roundTrip(json, paths);
    expect(parsed).toEqual({ ok: true, manifest });
  });

  it("不是這個 app 的檔案", () => {
    const parsed = roundTrip({ hello: "world" }, []);
    expect(!parsed.ok && parsed.error).toContain("這不是換了沒的備份檔");
  });

  it("較新版本的格式要先更新 app", () => {
    const parsed = roundTrip({ ...manifest, version: 99 }, paths);
    expect(!parsed.ok && parsed.error).toContain("較新版本");
  });

  it("缺照片檔、物品沒有更換紀錄時擋下", () => {
    expect(roundTrip(json, paths.slice(1)).ok).toBe(false);
    const noLogs = {
      ...manifest,
      data: { ...manifest.data, logs: [], purchases: [] },
    };
    const parsed = roundTrip(noLogs, paths.slice(0, 1));
    expect(!parsed.ok && parsed.error).toContain("沒有任何更換紀錄");
  });
});

describe("zip 打包與解開", () => {
  it("backup.json 與照片原樣取回", () => {
    const photo = new Uint8Array([0xff, 0xd8, 1, 2, 3]);
    const bytes = packBackup('{"a":1}', new Map([["photos/x/0.jpg", photo]]));
    const { json, files } = unpackBackup(bytes);
    expect(json).toEqual({ a: 1 });
    expect([...(files.get("photos/x/0.jpg") ?? [])]).toEqual([...photo]);
  });

  it("不是 zip 時丟出可讀的錯誤", () => {
    expect(() => unpackBackup(new Uint8Array([1, 2, 3]))).toThrow("不是 zip");
  });
});

describe("檔名與摘要", () => {
  it("檔名帶日期", () => {
    expect(backupFileName("2026-09-15" as IsoDate)).toBe(
      "換了沒-備份-2026-09-15.zip",
    );
  });

  it("照片數包含物品照片與耗材照片", () => {
    expect(backupSummary(data)).toEqual({
      items: 1,
      logs: 1,
      photos: 3,
      locations: 1,
      categories: 1,
    });
  });
});
