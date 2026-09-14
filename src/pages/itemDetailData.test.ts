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
import {
  buildIntervalFeedback,
  buildItemDetailData,
  suggestCycleDays,
} from "./itemDetailData.ts";

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

describe("型號變更與週期變更標示", () => {
  function detail(logs: Log[]) {
    const data = buildItemDetailData(
      { locations, categories, items: [item("a")], logs, today },
      "a",
    );
    if (!data.found) {
      throw new Error("應該找得到物品");
    }
    return data.history;
  }

  it("品牌型號只差大小寫或全形時不算變更；從有填換成沒填算變更", () => {
    const history = detail([
      { ...logOn("old", "a", "2026-01-01"), brand: "3M", model: "9808" },
      { ...logOn("mid", "a", "2026-04-01"), brand: "３ｍ", model: " 9808" },
      { ...logOn("new", "a", "2026-07-01"), brand: null, model: null },
    ]);
    expect(history.map((row) => [row.log.id, row.modelChanged])).toEqual([
      ["new", true],
      ["mid", false],
      ["old", false],
    ]);
  });

  it("週期不同時帶出前一筆的週期", () => {
    const history = detail([
      logOn("old", "a", "2026-01-01"),
      { ...logOn("new", "a", "2026-04-01"), cycleDays: 60 },
    ]);
    expect(history.map((row) => row.previousCycleDays)).toEqual([90, null]);
  });
});

describe("buildIntervalFeedback", () => {
  const at = (id: string, date: string, cycleDays = 90) => ({
    ...logOn(id, "a", date),
    cycleDays,
  });

  it("只有一個間隔時不顯示", () => {
    expect(
      buildIntervalFeedback([at("b", "2026-05-01"), at("a", "2026-01-01")]),
    ).toBeNull();
  });

  it("平均跟目前週期差不到 10 天時不顯示", () => {
    // 間隔 95、95 天，週期 90
    expect(
      buildIntervalFeedback([
        at("c", "2026-07-09"),
        at("b", "2026-04-05"),
        at("a", "2025-12-31"),
      ]),
    ).toBeNull();
  });

  it("只取最近 3 次間隔，建議值四捨五入到 10 天", () => {
    const feedback = buildIntervalFeedback([
      at("e", "2026-09-01"),
      at("d", "2026-05-12"), // 112
      at("c", "2026-01-02"), // 130
      at("b", "2025-09-12"), // 112
      at("a", "2025-01-01"), // 很久以前，不算
    ]);
    expect(feedback).toEqual({
      currentCycleDays: 90,
      averageDays: 118,
      gaps: [112, 130, 112],
      suggestedCycleDays: 120,
    });
  });

  it("日期未記錄的紀錄跳過", () => {
    const unknown = logUnknownDate("u", "a", "2026-12-01");
    const feedback = buildIntervalFeedback([
      at("c", "2026-09-01", 30),
      at("b", "2026-08-01", 30),
      at("a", "2026-07-01", 30),
      unknown,
    ]);
    expect(feedback).toBeNull();
  });
});

describe("suggestCycleDays", () => {
  it("30 天以上四捨五入到 10 天", () => {
    expect(suggestCycleDays(118)).toBe(120);
    expect(suggestCycleDays(30)).toBe(30);
  });

  it("30 天以下用平均本身，不小於 1 天", () => {
    expect(suggestCycleDays(7)).toBe(7);
    expect(suggestCycleDays(0)).toBe(1);
  });
});
