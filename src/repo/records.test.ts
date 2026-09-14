import { describe, expect, it } from "vitest";
import type {
  CategoryId,
  IsoDate,
  ItemId,
  LocationId,
  LogId,
} from "../shared/types.ts";
import {
  RepoDataError,
  newRecordId,
  toItem,
  toItemRecord,
  toLocation,
  toLog,
  toLogRecord,
  toPurchase,
  toPurchaseRecord,
  toSettings,
} from "./records.ts";

// 以下 fixture 取自 P1-6 對 PocketBase v0.40.3 實測的 API 回應（只填必填欄位）
const itemResponse = {
  category: "qsbu3m55l82alp5",
  collectionId: "pbc_710432678",
  collectionName: "items",
  created: "2026-09-11 14:58:49.685Z",
  householdId: "",
  id: "2wg13vfowzd2p5c",
  label: "",
  leadDays: 0,
  location: "14vuuevi5v19yyi",
  note: "",
  paused: false,
  pausedUntil: "",
  photos: [],
  updated: "2026-09-11 14:58:49.685Z",
};

const logResponse = {
  brand: "",
  collectionId: "pbc_3615662572",
  collectionName: "logs",
  created: "2026-09-11 14:59:13.744Z",
  cycleDays: 90,
  expectedDue: "2026-12-01",
  id: "bgze7cmyq7ztdop",
  item: "2wg13vfowzd2p5c",
  model: "",
  note: "",
  photos: [],
  purchase: "",
  replacedOn: "",
  updated: "2026-09-11 14:59:13.744Z",
};

describe("toItem", () => {
  it("把 PocketBase 的零值轉成 null", () => {
    expect(toItem(itemResponse)).toEqual({
      id: "2wg13vfowzd2p5c",
      locationId: "14vuuevi5v19yyi",
      categoryId: "qsbu3m55l82alp5",
      label: null,
      leadDays: 0,
      note: null,
      paused: false,
      pausedUntil: null,
      photos: [],
    });
  });

  it("照片檔名原樣帶出", () => {
    expect(
      toItem({ ...itemResponse, photos: ["a_1.jpg", "b_2.jpg"] }).photos,
    ).toEqual(["a_1.jpg", "b_2.jpg"]);
  });

  it("暫停中且有預計恢復日", () => {
    expect(
      toItem({ ...itemResponse, paused: true, pausedUntil: "2026-12-01" }),
    ).toMatchObject({ paused: true, pausedUntil: "2026-12-01" });
  });

  it("暫停中卻沒有預計恢復日時丟出錯誤", () => {
    expect(() => toItem({ ...itemResponse, paused: true })).toThrow(
      RepoDataError,
    );
  });

  it("沒有暫停卻有預計恢復日時丟出錯誤", () => {
    expect(() =>
      toItem({ ...itemResponse, pausedUntil: "2026-12-01" }),
    ).toThrow(RepoDataError);
  });

  it("提前提醒天數是負數時丟出錯誤", () => {
    expect(() => toItem({ ...itemResponse, leadDays: -1 })).toThrow(
      RepoDataError,
    );
  });
});

describe("toLog", () => {
  it("把零值轉成 null，時間戳轉成 ISO 8601", () => {
    expect(toLog(logResponse)).toEqual({
      id: "bgze7cmyq7ztdop",
      itemId: "2wg13vfowzd2p5c",
      cycleDays: 90,
      brand: null,
      model: null,
      note: null,
      purchaseId: null,
      createdAt: "2026-09-11T14:59:13.744Z",
      photos: [],
      replacedOn: null,
      expectedDue: "2026-12-01",
    });
  });

  it("有更換日期、沒有預計到期日", () => {
    expect(
      toLog({ ...logResponse, replacedOn: "2026-09-10", expectedDue: "" }),
    ).toMatchObject({ replacedOn: "2026-09-10", expectedDue: null });
  });

  it("兩個日期都有值時丟出錯誤", () => {
    expect(() => toLog({ ...logResponse, replacedOn: "2026-09-10" })).toThrow(
      RepoDataError,
    );
  });

  it("兩個日期都沒有值時丟出錯誤", () => {
    expect(() => toLog({ ...logResponse, expectedDue: "" })).toThrow(
      RepoDataError,
    );
  });

  it.each(["2026-02-30", "2026-13-01", "2026/09/10", "2026-9-10"])(
    "不合法的日期 %s 丟出錯誤",
    (date) => {
      expect(() => toLog({ ...logResponse, expectedDue: date })).toThrow(
        RepoDataError,
      );
    },
  );

  it("閏年的 2 月 29 日是合法日期", () => {
    expect(toLog({ ...logResponse, expectedDue: "2028-02-29" })).toMatchObject({
      expectedDue: "2028-02-29",
    });
  });

  it("週期小於 1 天時丟出錯誤", () => {
    expect(() => toLog({ ...logResponse, cycleDays: 0 })).toThrow(
      RepoDataError,
    );
  });
});

describe("toPurchase", () => {
  const purchaseResponse = {
    collectionId: "pbc_1",
    collectionName: "purchases",
    created: "2026-09-14 04:00:00.000Z",
    householdId: "",
    id: "p00000000000001",
    note: "",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    updated: "2026-09-14 04:00:00.000Z",
  };

  it("單價 0 是贈品，照樣是合法值；空的單位與備註轉成 null", () => {
    expect(toPurchase(purchaseResponse)).toEqual({
      id: "p00000000000001",
      unitPrice: 0,
      quantity: 1,
      unit: null,
      note: null,
    });
  });

  it("數量是 0（PocketBase 的零值）時丟出錯誤", () => {
    expect(() => toPurchase({ ...purchaseResponse, quantity: 0 })).toThrow(
      RepoDataError,
    );
  });

  it("寫出時 null 轉回空字串，再讀回內容不變", () => {
    const purchase = toPurchase({ ...purchaseResponse, unit: "捲" });
    const record = toPurchaseRecord(purchase);
    expect(record.note).toBe("");
    expect(toPurchase({ ...record })).toEqual(purchase);
  });
});

describe("toLocation", () => {
  const locationResponse = {
    id: "14vuuevi5v19yyi",
    name: "測試位置",
    icon: "sofa",
    sortOrder: 0,
    householdId: "",
  };

  it("轉換位置", () => {
    expect(toLocation(locationResponse)).toEqual({
      id: "14vuuevi5v19yyi",
      name: "測試位置",
      icon: "sofa",
      sortOrder: 0,
    });
  });

  it("名稱是空字串時丟出錯誤", () => {
    expect(() => toLocation({ ...locationResponse, name: "" })).toThrow(
      RepoDataError,
    );
  });
});

describe("toSettings", () => {
  it("組成 Settings 物件", () => {
    expect(
      toSettings([
        { id: "qafji2f2j2rt55a", key: "defaultLeadDays", value: "7" },
      ]),
    ).toEqual({ defaultLeadDays: 7 });
  });

  it("找不到 defaultLeadDays 時丟出錯誤", () => {
    expect(() => toSettings([])).toThrow(RepoDataError);
  });

  it.each(["", "-1", "7.5", "abc"])("值 %j 不是非負整數時丟出錯誤", (value) => {
    expect(() => toSettings([{ key: "defaultLeadDays", value }])).toThrow(
      RepoDataError,
    );
  });
});

describe("寫出時把 null 轉回空字串", () => {
  it("toItemRecord", () => {
    expect(
      toItemRecord({
        id: "2wg13vfowzd2p5c" as ItemId,
        locationId: "14vuuevi5v19yyi" as LocationId,
        categoryId: "qsbu3m55l82alp5" as CategoryId,
        label: null,
        leadDays: 0,
        note: null,
        paused: false,
        pausedUntil: null,
      }),
    ).toEqual({
      id: "2wg13vfowzd2p5c",
      location: "14vuuevi5v19yyi",
      category: "qsbu3m55l82alp5",
      label: "",
      leadDays: 0,
      note: "",
      paused: false,
      pausedUntil: "",
    });
  });

  it("toLogRecord", () => {
    expect(
      toLogRecord({
        id: "bgze7cmyq7ztdop" as LogId,
        itemId: "2wg13vfowzd2p5c" as ItemId,
        cycleDays: 90,
        brand: null,
        model: null,
        note: null,
        purchaseId: null,
        replacedOn: null,
        expectedDue: "2026-12-01" as IsoDate,
      }),
    ).toEqual({
      id: "bgze7cmyq7ztdop",
      item: "2wg13vfowzd2p5c",
      replacedOn: "",
      expectedDue: "2026-12-01",
      cycleDays: 90,
      brand: "",
      model: "",
      note: "",
      purchase: "",
    });
  });

  it("寫出再讀回，除了照片以外內容不變", () => {
    const log = toLog({ ...logResponse, photos: ["a_1.jpg"] });
    const record = toLogRecord(log);
    // 照片刻意不寫出：update 時送 photos 會刪掉沒列到的檔案（見 toItemRecord 的註解）
    expect(record).not.toHaveProperty("photos");
    expect(
      toLog({ ...record, created: logResponse.created, photos: log.photos }),
    ).toEqual(log);
  });
});

describe("newRecordId", () => {
  it("產生 15 個 [a-z0-9] 字元，且每次不同", () => {
    const ids = Array.from({ length: 200 }, () => newRecordId());
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]{15}$/);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
