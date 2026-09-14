import { describe, expect, it } from "vitest";
import type { IsoDate, ItemId, Log, LogId } from "../shared/types.ts";
import {
  buildLogSubmission,
  canDeleteLog,
  describeOutcome,
  initialLogForm,
  type LogFormState,
} from "./logForm.ts";

const today = "2026-09-10" as IsoDate;

function dated(id: string, replacedOn: string, overrides: Partial<Log> = {}) {
  return {
    id: id as LogId,
    itemId: "item1" as ItemId,
    replacedOn: replacedOn as IsoDate,
    expectedDue: null,
    cycleDays: 90,
    brand: "3M",
    model: "9808",
    note: null,
    purchaseId: null,
    createdAt: `${replacedOn}T10:00:00.000Z`,
    ...overrides,
  } as Log;
}

const unknown = {
  ...dated("old", "2025-01-01"),
  replacedOn: null,
  expectedDue: "2025-06-01" as IsoDate,
} as Log;

function submitOk(form: LogFormState, log: Log) {
  const result = buildLogSubmission(form, log, today);
  if (!result.ok) {
    throw new Error(`預期通過驗證，實際錯誤：${JSON.stringify(result.errors)}`);
  }
  return result.log;
}

describe("initialLogForm", () => {
  it("有日期的紀錄帶入原本的值", () => {
    expect(
      initialLogForm(dated("a", "2026-06-01", { note: "好市多" }), today),
    ).toEqual({
      hasDate: true,
      date: "2026-06-01",
      brand: "3M",
      model: "9808",
      cycle: "90",
      customCycle: false,
      note: "好市多",
    });
  });

  it("日期未記錄的紀錄一開始沒有日期，補上日期時預設今天", () => {
    const form = initialLogForm(unknown, today);
    expect(form.hasDate).toBe(false);
    expect(form.date).toBe("2026-09-10");
  });
});

describe("buildLogSubmission", () => {
  it("改日期、品牌型號、週期、備註，其他欄位沿用原值", () => {
    const log = dated("a", "2026-06-01");
    const updated = submitOk(
      {
        ...initialLogForm(log, today),
        date: "2026-05-01",
        brand: " ",
        cycle: "60",
        note: " 蝦皮 ",
      },
      log,
    );
    expect(updated).toEqual({
      ...log,
      replacedOn: "2026-05-01",
      brand: null,
      cycleDays: 60,
      note: "蝦皮",
    });
  });

  it("補上日期後清掉預計到期日", () => {
    const updated = submitOk(
      { ...initialLogForm(unknown, today), hasDate: true, date: "2025-01-05" },
      unknown,
    );
    expect(updated.replacedOn).toBe("2025-01-05");
    expect(updated.expectedDue).toBeNull();
  });

  it("沒補日期時，日期與預計到期日原樣保留", () => {
    const updated = submitOk(initialLogForm(unknown, today), unknown);
    expect(updated.replacedOn).toBeNull();
    expect(updated.expectedDue).toBe("2025-06-01");
  });

  it("日期不能晚於今天", () => {
    const log = dated("a", "2026-06-01");
    const result = buildLogSubmission(
      { ...initialLogForm(log, today), date: "2026-09-11" },
      log,
      today,
    );
    expect(!result.ok && result.errors.date).toBe("更換日期不能晚於今天");
  });

  it("週期不合法", () => {
    const log = dated("a", "2026-06-01");
    const result = buildLogSubmission(
      { ...initialLogForm(log, today), cycle: "0" },
      log,
      today,
    );
    expect(!result.ok && result.errors.cycle).toBe("請填週期天數");
  });
});

describe("canDeleteLog", () => {
  it("只剩一筆時不能刪", () => {
    expect(canDeleteLog([dated("a", "2026-06-01")])).toBe(false);
    expect(
      canDeleteLog([dated("a", "2026-06-01"), dated("b", "2026-03-01")]),
    ).toBe(true);
  });
});

describe("describeOutcome", () => {
  const newer = dated("new", "2026-06-01");
  const older = dated("old", "2026-03-01");

  it("最近一次與到期日都沒變時回 null", () => {
    const edited = { ...older, brand: "Panasonic" };
    expect(describeOutcome([newer, older], [newer, edited], older.id)).toBe(
      null,
    );
  });

  it("把較舊那筆改到最新：這筆現在是最近一次，到期日跟著變", () => {
    const edited = { ...older, replacedOn: "2026-07-01" as IsoDate } as Log;
    expect(describeOutcome([newer, older], [newer, edited], older.id)).toBe(
      "這筆現在是最近一次，到期日改為 9/29",
    );
  });

  it("把最近一次改到更早：另一筆變成最近一次", () => {
    const edited = { ...newer, replacedOn: "2026-01-01" as IsoDate } as Log;
    expect(describeOutcome([newer, older], [edited, older], newer.id)).toBe(
      "2026-03-01 那筆現在是最近一次，到期日改為 5/30",
    );
  });

  it("只改最近一次的週期：只說到期日", () => {
    const edited = { ...newer, cycleDays: 60 };
    expect(describeOutcome([newer, older], [edited, older], newer.id)).toBe(
      "到期日改為 7/31",
    );
  });

  it("刪除最近一次", () => {
    expect(describeOutcome([newer, older], [older], null)).toBe(
      "2026-03-01 那筆現在是最近一次，到期日改為 5/30",
    );
  });
});
