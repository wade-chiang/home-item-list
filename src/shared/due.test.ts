import { describe, expect, it } from "vitest";
import {
  calcDue,
  calcStatus,
  daysUntilDue,
  latestLog,
  sortLogsNewestFirst,
} from "./due.ts";
import type {
  CategoryId,
  IsoDate,
  Item,
  ItemId,
  LocationId,
  Log,
  LogId,
} from "./types.ts";

const d = (value: string) => value as IsoDate;

const base = {
  itemId: "item00000000001" as ItemId,
  brand: null,
  model: null,
  note: null,
  purchaseId: null,
};

/** 有更換日期的紀錄 */
function logOn(
  id: string,
  replacedOn: string,
  cycleDays: number,
  createdAt: string,
): Log {
  return {
    ...base,
    id: id as LogId,
    cycleDays,
    createdAt,
    replacedOn: d(replacedOn),
    expectedDue: null,
  };
}

/** 日期未記錄、只有預計到期日的紀錄 */
function logUnknownDate(
  id: string,
  expectedDue: string,
  cycleDays: number,
  createdAt: string,
): Log {
  return {
    ...base,
    id: id as LogId,
    cycleDays,
    createdAt,
    replacedOn: null,
    expectedDue: d(expectedDue),
  };
}

const activeItem: Item = {
  id: "item00000000001" as ItemId,
  locationId: "loc000000000001" as LocationId,
  categoryId: "cat000000000001" as CategoryId,
  label: null,
  leadDays: 7,
  note: null,
  paused: false,
  pausedUntil: null,
};

const ids = (logs: Log[]) => logs.map((log) => log.id);

describe("sortLogsNewestFirst", () => {
  it("依更換日期由新到舊", () => {
    const logs = [
      logOn("a", "2026-03-01", 90, "2026-03-01T10:00:00.000Z"),
      logOn("b", "2026-06-01", 90, "2026-06-01T10:00:00.000Z"),
    ];
    expect(ids(sortLogsNewestFirst(logs))).toEqual(["b", "a"]);
  });

  it("日期未記錄的排最後", () => {
    const logs = [
      logUnknownDate("unknown", "2026-04-01", 90, "2026-09-01T10:00:00.000Z"),
      logOn("dated", "2026-03-01", 90, "2026-03-01T10:00:00.000Z"),
    ];
    expect(ids(sortLogsNewestFirst(logs))).toEqual(["dated", "unknown"]);
  });

  it("同一天有多筆時，較晚建立的較新", () => {
    const logs = [
      logOn("earlier", "2026-06-01", 90, "2026-06-01T09:00:00.000Z"),
      logOn("later", "2026-06-01", 60, "2026-06-01T21:00:00.000Z"),
    ];
    expect(ids(sortLogsNewestFirst(logs))).toEqual(["later", "earlier"]);
  });

  it("補登的舊紀錄雖然建立得較晚，仍依日期排在後面", () => {
    const logs = [
      logOn("recent", "2026-06-01", 90, "2026-06-01T10:00:00.000Z"),
      logOn("backfilled", "2026-01-01", 90, "2026-06-02T10:00:00.000Z"),
    ];
    expect(ids(sortLogsNewestFirst(logs))).toEqual(["recent", "backfilled"]);
  });

  it("都未記錄日期時，較晚建立的較新", () => {
    const logs = [
      logUnknownDate("earlier", "2026-04-01", 90, "2026-01-01T10:00:00.000Z"),
      logUnknownDate("later", "2026-05-01", 90, "2026-02-01T10:00:00.000Z"),
    ];
    expect(ids(sortLogsNewestFirst(logs))).toEqual(["later", "earlier"]);
  });

  it("不改動傳入的陣列", () => {
    const logs = [
      logOn("a", "2026-03-01", 90, "2026-03-01T10:00:00.000Z"),
      logOn("b", "2026-06-01", 90, "2026-06-01T10:00:00.000Z"),
    ];
    sortLogsNewestFirst(logs);
    expect(ids(logs)).toEqual(["a", "b"]);
  });
});

describe("latestLog", () => {
  it("沒有任何紀錄時丟出錯誤", () => {
    expect(() => latestLog([])).toThrow();
  });
});

describe("calcDue", () => {
  it("最近一筆的更換日期加上該筆週期", () => {
    const logs = [logOn("a", "2026-09-10", 90, "2026-09-10T10:00:00.000Z")];
    expect(calcDue(logs)).toBe("2026-12-09");
  });

  it("週期取最近一筆的，不是最早那筆", () => {
    const logs = [
      logOn("old", "2026-03-01", 90, "2026-03-01T10:00:00.000Z"),
      logOn("new", "2026-06-01", 60, "2026-06-01T10:00:00.000Z"),
    ];
    expect(calcDue(logs)).toBe("2026-07-31");
  });

  it("最近一筆日期未記錄時，用預計到期日", () => {
    const logs = [
      logUnknownDate("a", "2026-11-15", 90, "2026-09-10T10:00:00.000Z"),
    ];
    expect(calcDue(logs)).toBe("2026-11-15");
  });

  it("日期未記錄的第一筆之後換過一次，改用有日期的那筆計算", () => {
    const logs = [
      logUnknownDate("first", "2026-10-01", 90, "2026-08-01T10:00:00.000Z"),
      logOn("replaced", "2026-09-20", 60, "2026-09-20T10:00:00.000Z"),
    ];
    expect(calcDue(logs)).toBe("2026-11-19");
  });
});

describe("daysUntilDue", () => {
  it("還有 N 天為正，今天到期為 0，逾期為負", () => {
    expect(daysUntilDue(d("2026-09-20"), d("2026-09-10"))).toBe(10);
    expect(daysUntilDue(d("2026-09-10"), d("2026-09-10"))).toBe(0);
    expect(daysUntilDue(d("2026-09-07"), d("2026-09-10"))).toBe(-3);
  });
});

describe("calcStatus", () => {
  const today = d("2026-09-10");

  it("暫停優先於逾期", () => {
    const pausedItem: Item = {
      ...activeItem,
      paused: true,
      pausedUntil: d("2026-12-01"),
    };
    expect(calcStatus(pausedItem, d("2026-01-01"), today)).toBe("paused");
  });

  it("昨天到期是逾期", () => {
    expect(calcStatus(activeItem, d("2026-09-09"), today)).toBe("overdue");
  });

  it("提前提醒 0 天時，今天到期是即將到期", () => {
    const item: Item = { ...activeItem, leadDays: 0 };
    expect(calcStatus(item, today, today)).toBe("soon");
    expect(calcStatus(item, d("2026-09-11"), today)).toBe("ok");
  });

  it("剛好差提前提醒天數是即將到期，多一天是正常", () => {
    expect(calcStatus(activeItem, d("2026-09-17"), today)).toBe("soon");
    expect(calcStatus(activeItem, d("2026-09-18"), today)).toBe("ok");
  });
});
