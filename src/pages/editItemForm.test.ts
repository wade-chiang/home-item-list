import { describe, expect, it } from "vitest";
import type {
  CategoryId,
  IsoDate,
  Item,
  ItemId,
  LocationId,
  Log,
  LogId,
} from "../shared/types.ts";
import {
  buildEditItemSubmission,
  type EditItemFormState,
  hasOtherDuplicate,
  initialEditItemForm,
} from "./editItemForm.ts";

const item: Item = {
  id: "item1" as ItemId,
  locationId: "loc1" as LocationId,
  categoryId: "cat1" as CategoryId,
  label: "水槽",
  leadDays: 7,
  note: "濾網在上蓋",
  paused: false,
  pausedUntil: null,
  photos: [],
};

const latestLog: Log = {
  id: "log1" as LogId,
  itemId: "item1" as ItemId,
  replacedOn: "2026-06-01" as IsoDate,
  expectedDue: null,
  cycleDays: 90,
  brand: "3M",
  model: "淨呼吸 9808",
  note: null,
  purchaseId: null,
  photos: [],
  createdAt: "2026-06-01T10:00:00.000Z",
};

function submitOk(form: EditItemFormState) {
  const result = buildEditItemSubmission(form, item, latestLog);
  if (!result.ok) {
    throw new Error(`預期通過驗證，實際錯誤：${JSON.stringify(result.errors)}`);
  }
  return result;
}

function submitErrors(form: EditItemFormState) {
  const result = buildEditItemSubmission(form, item, latestLog);
  if (result.ok) {
    throw new Error("預期驗證失敗，實際通過");
  }
  return result.errors;
}

describe("initialEditItemForm", () => {
  it("物品欄位取自物品，品牌型號週期取自最近一筆更換紀錄", () => {
    expect(initialEditItemForm(item, latestLog)).toEqual({
      locationId: "loc1",
      categoryId: "cat1",
      label: "水槽",
      brand: "3M",
      model: "淨呼吸 9808",
      cycle: "90",
      customCycle: false,
      leadDays: "7",
      note: "濾網在上蓋",
    });
  });

  it("沒填的欄位預填空白；週期不在快速選項時打開自訂", () => {
    const form = initialEditItemForm(
      { ...item, label: null, note: null },
      { ...latestLog, brand: null, model: null, cycleDays: 45 },
    );
    expect(form.label).toBe("");
    expect(form.note).toBe("");
    expect(form.brand).toBe("");
    expect(form.customCycle).toBe(true);
  });
});

describe("hasOtherDuplicate", () => {
  const other: Item = { ...item, id: "item2" as ItemId };

  it("只有自己時不算重複", () => {
    expect(
      hasOtherDuplicate(initialEditItemForm(item, latestLog), [item], item.id),
    ).toBe(false);
  });

  it("有別的物品同位置同類別時算重複", () => {
    expect(
      hasOtherDuplicate(
        initialEditItemForm(item, latestLog),
        [item, other],
        item.id,
      ),
    ).toBe(true);
  });
});

describe("buildEditItemSubmission", () => {
  const base = initialEditItemForm(item, latestLog);

  it("寫回物品與最近一筆紀錄，沒出現在表單上的欄位沿用原值", () => {
    const result = submitOk({
      ...base,
      locationId: "loc2",
      label: " ",
      brand: "Panasonic",
      cycle: "60",
      note: " 改過 ",
    });
    expect(result.item).toEqual({
      ...item,
      locationId: "loc2",
      label: null,
      note: "改過",
    });
    expect(result.latestLog).toEqual({
      ...latestLog,
      brand: "Panasonic",
      cycleDays: 60,
    });
  });

  it("提前提醒 0 天是合法值，不會改回原值", () => {
    expect(submitOk({ ...base, leadDays: "0" }).item.leadDays).toBe(0);
  });

  it.each(["", "0", "1.5"])("週期 %j 不合法", (cycle) => {
    expect(submitErrors({ ...base, cycle }).cycle).toBe("請選擇週期");
  });

  it.each(["", "-1", "abc"])("提前提醒 %j 不合法", (leadDays) => {
    expect(submitErrors({ ...base, leadDays }).leadDays).toBeDefined();
  });

  it("日期未記錄的紀錄，更換日期與預計到期日原樣保留", () => {
    const unknown: Log = {
      ...latestLog,
      replacedOn: null,
      expectedDue: "2026-12-01" as IsoDate,
    };
    const result = buildEditItemSubmission(base, item, unknown);
    expect(result.ok && result.latestLog.expectedDue).toBe("2026-12-01");
  });
});
