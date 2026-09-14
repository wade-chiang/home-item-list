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
import { buildItemDetailData } from "./itemDetailData.ts";

const d = (value: string) => value as IsoDate;
const today = d("2026-09-10");

const locations: Location[] = [
  { id: "loc1" as LocationId, name: "主臥", icon: "bed-double", sortOrder: 0 },
];
const categories: Category[] = [
  {
    id: "cat1" as CategoryId,
    name: "冷氣濾網",
    icon: "air-vent",
    sortOrder: 0,
  },
];

function item(id: string): Item {
  return {
    id: id as ItemId,
    locationId: "loc1" as LocationId,
    categoryId: "cat1" as CategoryId,
    label: null,
    leadDays: 7,
    note: null,
    paused: false,
    pausedUntil: null,
    photos: [],
  };
}

function logOn(id: string, itemId: string, replacedOn: string): Log {
  return {
    id: id as LogId,
    itemId: itemId as ItemId,
    cycleDays: 90,
    brand: null,
    model: null,
    note: null,
    purchaseId: null,
    photos: [],
    createdAt: `${replacedOn}T10:00:00.000Z`,
    replacedOn: d(replacedOn),
    expectedDue: null,
  };
}

function logUnknownDate(id: string, itemId: string, expectedDue: string): Log {
  return {
    id: id as LogId,
    itemId: itemId as ItemId,
    cycleDays: 90,
    brand: null,
    model: null,
    note: null,
    purchaseId: null,
    photos: [],
    createdAt: "2026-01-01T10:00:00.000Z",
    replacedOn: null,
    expectedDue: d(expectedDue),
  };
}

describe("buildItemDetailData", () => {
  it("找不到物品時回傳 found: false", () => {
    const data = buildItemDetailData(
      { locations, categories, items: [item("a")], logs: [], today },
      "missing",
    );
    expect(data).toEqual({ found: false });
  });

  it("只組這個物品：其他物品沒有更換紀錄也不影響", () => {
    const items = [item("a"), item("broken")];
    const logs = [logOn("log1", "a", "2026-09-01")];

    const data = buildItemDetailData(
      { locations, categories, items, logs, today },
      "a",
    );

    expect(data.found).toBe(true);
  });

  it("更換歷史由新到舊，算出與前一筆相隔的天數", () => {
    const logs = [
      logOn("jan", "a", "2026-01-01"),
      logOn("jul", "a", "2026-07-01"),
      logOn("apr", "a", "2026-04-01"),
    ];

    const data = buildItemDetailData(
      { locations, categories, items: [item("a")], logs, today },
      "a",
    );
    if (!data.found) {
      throw new Error("應該找得到物品");
    }

    expect(
      data.history.map((row) => [row.log.id, row.gapDays, row.isOldest]),
    ).toEqual([
      ["jul", 91, false],
      ["apr", 90, false],
      ["jan", null, true],
    ]);
  });

  it("前一筆日期未記錄時，這一筆沒有間隔天數", () => {
    const logs = [
      logUnknownDate("unknown", "a", "2026-08-01"),
      logOn("dated", "a", "2026-09-01"),
    ];

    const data = buildItemDetailData(
      { locations, categories, items: [item("a")], logs, today },
      "a",
    );
    if (!data.found) {
      throw new Error("應該找得到物品");
    }

    // 日期未記錄的排在最後，是最舊的一筆
    expect(
      data.history.map((row) => [row.log.id, row.gapDays, row.isOldest]),
    ).toEqual([
      ["dated", null, false],
      ["unknown", null, true],
    ]);
  });

  it("只有一筆時，那一筆就是最舊的", () => {
    const data = buildItemDetailData(
      {
        locations,
        categories,
        items: [item("a")],
        logs: [logOn("only", "a", "2026-09-01")],
        today,
      },
      "a",
    );
    if (!data.found) {
      throw new Error("應該找得到物品");
    }

    expect(data.history).toHaveLength(1);
    expect(data.history[0].isOldest).toBe(true);
    expect(data.history[0].gapDays).toBeNull();
  });
});
