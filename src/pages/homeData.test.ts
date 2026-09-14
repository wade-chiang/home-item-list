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
import { buildHomeData } from "./homeData.ts";

const d = (value: string) => value as IsoDate;
const today = d("2026-09-10");

function location(id: string, name: string, sortOrder: number): Location {
  return { id: id as LocationId, name, icon: "sofa", sortOrder };
}

function category(id: string, name: string): Category {
  return { id: id as CategoryId, name, icon: "air-vent", sortOrder: 0 };
}

function item(id: string, locationId: string, categoryId: string): Item {
  return {
    id: id as ItemId,
    locationId: locationId as LocationId,
    categoryId: categoryId as CategoryId,
    label: null,
    leadDays: 7,
    note: null,
    paused: false,
    pausedUntil: null,
  };
}

/** 更換日期 replacedOn ＋ 週期 cycleDays 就是到期日 */
function log(
  id: string,
  itemId: string,
  replacedOn: string,
  cycleDays: number,
): Log {
  return {
    id: id as LogId,
    itemId: itemId as ItemId,
    cycleDays,
    brand: null,
    model: null,
    note: null,
    purchaseId: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    replacedOn: d(replacedOn),
    expectedDue: null,
  };
}

const locations = [location("loc1", "主臥", 0), location("loc2", "客廳", 1)];
const categories = [category("cat1", "冷氣濾網")];

describe("buildHomeData", () => {
  it("依位置分組，組內依剩餘天數由少到多", () => {
    const items = [
      item("itemA", "loc1", "cat1"),
      item("itemB", "loc1", "cat1"),
      item("itemC", "loc2", "cat1"),
    ];
    const logs = [
      // 到期日 2026-09-30（還有 20 天）
      log("logA", "itemA", "2026-09-10", 20),
      // 到期日 2026-09-15（還有 5 天）
      log("logB", "itemB", "2026-09-10", 5),
      log("logC", "itemC", "2026-09-10", 30),
    ];

    const home = buildHomeData({ locations, categories, items, logs, today });

    expect(home.groups.map((group) => group.location.name)).toEqual([
      "主臥",
      "客廳",
    ]);
    expect(home.groups[0].items.map((entry) => entry.item.id)).toEqual([
      "itemB",
      "itemA",
    ]);
    expect(home.totalCount).toBe(3);
  });

  it("有逾期物品的位置置頂", () => {
    const items = [
      item("itemA", "loc1", "cat1"),
      item("itemB", "loc2", "cat1"),
    ];
    const logs = [
      log("logA", "itemA", "2026-09-01", 30),
      // 客廳這筆已逾期：到期日 2026-09-05
      log("logB", "itemB", "2026-09-01", 4),
    ];

    const home = buildHomeData({ locations, categories, items, logs, today });

    expect(home.groups.map((group) => group.location.name)).toEqual([
      "客廳",
      "主臥",
    ]);
    expect(home.groups[0].hasOverdue).toBe(true);
    expect(home.groups[1].hasOverdue).toBe(false);
  });

  it("統計三種狀態的數量", () => {
    const items = [
      item("overdue", "loc1", "cat1"),
      item("soon", "loc1", "cat1"),
      item("ok", "loc1", "cat1"),
    ];
    const logs = [
      // 逾期 5 天
      log("log1", "overdue", "2026-09-01", 4),
      // 還有 3 天，提前提醒 7 天內算即將到期
      log("log2", "soon", "2026-09-10", 3),
      // 還有 30 天
      log("log3", "ok", "2026-09-10", 30),
    ];

    const home = buildHomeData({ locations, categories, items, logs, today });

    expect(home.counts).toEqual({ overdue: 1, soon: 1, ok: 1 });
  });

  it("暫停的物品不出現在位置區塊，也不列入統計", () => {
    const paused: Item = {
      ...item("paused", "loc1", "cat1"),
      paused: true,
      pausedUntil: d("2026-12-01"),
    };
    const items = [item("itemA", "loc1", "cat1"), paused];
    const logs = [
      log("logA", "itemA", "2026-09-10", 30),
      log("logPaused", "paused", "2026-09-10", 30),
    ];

    const home = buildHomeData({ locations, categories, items, logs, today });

    expect(home.groups[0].items.map((entry) => entry.item.id)).toEqual([
      "itemA",
    ]);
    expect(home.counts.ok).toBe(1);
    expect(home.totalCount).toBe(2);
    expect(home.paused).toEqual({ count: 1, locationNames: ["主臥"] });
  });

  it("到了預計恢復日的物品回到位置區塊，不算暫停", () => {
    const resumed: Item = {
      ...item("resumed", "loc1", "cat1"),
      paused: true,
      pausedUntil: today,
    };
    const logs = [log("logResumed", "resumed", "2026-09-10", 30)];

    const home = buildHomeData({
      locations,
      categories,
      items: [resumed],
      logs,
      today,
    });

    expect(home.groups[0].items.map((entry) => entry.item.id)).toEqual([
      "resumed",
    ]);
    expect(home.paused).toEqual({ count: 0, locationNames: [] });
  });

  it("沒有物品的位置不顯示", () => {
    const items = [item("itemA", "loc1", "cat1")];
    const logs = [log("logA", "itemA", "2026-09-10", 30)];

    const home = buildHomeData({ locations, categories, items, logs, today });

    expect(home.groups.map((group) => group.location.name)).toEqual(["主臥"]);
  });

  it("物品沒有更換紀錄時丟出錯誤", () => {
    const items = [item("itemA", "loc1", "cat1")];

    expect(() =>
      buildHomeData({ locations, categories, items, logs: [], today }),
    ).toThrow();
  });

  it("找不到類別時丟出錯誤", () => {
    const items = [item("itemA", "loc1", "missing")];
    const logs = [log("logA", "itemA", "2026-09-10", 30)];

    expect(() =>
      buildHomeData({ locations, categories, items, logs, today }),
    ).toThrow(/找不到類別/);
  });

  // P1-11 原本只檢查類別，位置不存在的物品會默默從首頁消失；P1-12 改用共用的 itemEntries 後補上
  it("找不到位置時丟出錯誤", () => {
    const items = [item("itemA", "missing", "cat1")];
    const logs = [log("logA", "itemA", "2026-09-10", 30)];

    expect(() =>
      buildHomeData({ locations, categories, items, logs, today }),
    ).toThrow(/找不到位置/);
  });
});
