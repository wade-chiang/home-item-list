import { describe, expect, it } from "vitest";
import type {
  Category,
  CategoryId,
  IsoDate,
  Item,
  ItemId,
  Location,
  LocationId,
  Log,
  LogId,
} from "../shared/types.ts";
import { buildItemsData } from "./itemsData.ts";

const d = (value: string) => value as IsoDate;
const today = d("2026-09-10");

function category(id: string, name: string, sortOrder: number): Category {
  return { id: id as CategoryId, name, icon: "air-vent", sortOrder };
}

function item(id: string, categoryId: string, paused = false): Item {
  const base = {
    id: id as ItemId,
    locationId: "loc1" as LocationId,
    categoryId: categoryId as CategoryId,
    label: null,
    leadDays: 7,
    note: null,
    photos: [],
  };
  return paused
    ? { ...base, paused: true, pausedUntil: d("2026-12-01") }
    : { ...base, paused: false, pausedUntil: null };
}

/** 更換日期 2026-09-10 ＋ 週期 cycleDays，所以剩餘天數就是 cycleDays */
function log(itemId: string, cycleDays: number): Log {
  return {
    id: `log-${itemId}` as LogId,
    itemId: itemId as ItemId,
    cycleDays,
    brand: null,
    model: null,
    note: null,
    purchaseId: null,
    photos: [],
    createdAt: "2026-09-10T10:00:00.000Z",
    replacedOn: d("2026-09-10"),
    expectedDue: null,
  };
}

const locations: Location[] = [
  { id: "loc1" as LocationId, name: "主臥", icon: "bed-double", sortOrder: 0 },
];
const categories = [
  category("cat1", "冷氣濾網", 0),
  category("cat2", "濾心", 1),
  category("cat3", "沒有物品的類別", 2),
];

describe("buildItemsData", () => {
  it("依類別的設定順序分組，沒有物品的類別不顯示", () => {
    const items = [item("a", "cat2"), item("b", "cat1")];
    const logs = [log("a", 30), log("b", 30)];

    const data = buildItemsData({ locations, categories, items, logs, today });

    expect(data.groups.map((group) => group.category.name)).toEqual([
      "冷氣濾網",
      "濾心",
    ]);
  });

  it("類別內依剩餘天數由少到多", () => {
    const items = [item("far", "cat1"), item("near", "cat1")];
    const logs = [log("far", 60), log("near", 5)];

    const data = buildItemsData({ locations, categories, items, logs, today });

    expect(data.groups[0].items.map((entry) => entry.item.id)).toEqual([
      "near",
      "far",
    ]);
  });

  it("暫停中的物品照樣列出，排在同類別的最後", () => {
    const items = [
      item("pausedSoon", "cat1", true),
      item("activeFar", "cat1"),
      item("activeNear", "cat1"),
    ];
    const logs = [
      log("pausedSoon", 1),
      log("activeFar", 90),
      log("activeNear", 10),
    ];

    const data = buildItemsData({ locations, categories, items, logs, today });

    expect(data.groups[0].items.map((entry) => entry.item.id)).toEqual([
      "activeNear",
      "activeFar",
      "pausedSoon",
    ]);
  });

  it("統計總數與暫停數", () => {
    const items = [
      item("a", "cat1"),
      item("b", "cat1", true),
      item("c", "cat2"),
    ];
    const logs = [log("a", 30), log("b", 30), log("c", 30)];

    const data = buildItemsData({ locations, categories, items, logs, today });

    expect(data.totalCount).toBe(3);
    expect(data.pausedCount).toBe(1);
  });

  it("沒有任何物品時沒有分組", () => {
    const data = buildItemsData({
      locations,
      categories,
      items: [],
      logs: [],
      today,
    });

    expect(data.groups).toEqual([]);
    expect(data.totalCount).toBe(0);
  });
});
