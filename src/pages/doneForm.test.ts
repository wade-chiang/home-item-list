import { describe, expect, it } from "vitest";
import type { IsoDate, ItemId, Log, LogId } from "../shared/types.ts";
import {
  becomesLatest,
  brandModelHint,
  buildDoneSubmission,
  type DoneFormState,
  initialDoneForm,
  isSameCycle,
} from "./doneForm.ts";

const today = "2026-09-10" as IsoDate;

function log(overrides: Partial<Log> = {}): Log {
  return {
    id: "log1" as LogId,
    itemId: "item1" as ItemId,
    replacedOn: "2026-06-01" as IsoDate,
    expectedDue: null,
    cycleDays: 90,
    brand: "3M",
    model: "淨呼吸 9808",
    note: null,
    purchaseId: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  } as Log;
}

function submitOk(form: DoneFormState) {
  const result = buildDoneSubmission(form, today);
  if (!result.ok) {
    throw new Error(`預期通過驗證，實際錯誤：${JSON.stringify(result.errors)}`);
  }
  return result.log;
}

function submitErrors(form: DoneFormState) {
  const result = buildDoneSubmission(form, today);
  if (result.ok) {
    throw new Error("預期驗證失敗，實際通過");
  }
  return result.errors;
}

describe("initialDoneForm", () => {
  it("預填上一次的品牌、型號、週期，日期預設今天", () => {
    const form = initialDoneForm(log(), today);
    expect(form).toEqual({
      date: "today",
      otherDate: "2026-09-10",
      brand: "3M",
      model: "淨呼吸 9808",
      cycle: "90",
      customCycle: false,
    });
  });

  it("上次沒填品牌型號時預填空白", () => {
    const form = initialDoneForm(log({ brand: null, model: null }), today);
    expect(form.brand).toBe("");
    expect(form.model).toBe("");
  });

  it("上次的週期不在快速選項裡時打開自訂", () => {
    const form = initialDoneForm(log({ cycleDays: 45 }), today);
    expect(form.customCycle).toBe(true);
    expect(form.cycle).toBe("45");
  });
});

describe("brandModelHint 與 isSameCycle", () => {
  const latest = log();
  const base = initialDoneForm(latest, today);

  it("沒改動時是沿用上次", () => {
    expect(brandModelHint(base, latest)).toBe("same");
    expect(isSameCycle(base, latest)).toBe(true);
  });

  it("只差大小寫、全形或空白時仍算相同", () => {
    expect(
      brandModelHint({ brand: "３ｍ", model: " 淨呼吸  9808" }, latest),
    ).toBe("same");
  });

  it("改了型號時是與上次不同", () => {
    expect(brandModelHint({ ...base, model: "9809" }, latest)).toBe("changed");
  });

  it("上次沒填、這次也沒填時是上次沒填", () => {
    const empty = log({ brand: null, model: null });
    expect(brandModelHint({ brand: "", model: " " }, empty)).toBe("lastEmpty");
  });

  it("上次沒填、這次填了時是與上次不同", () => {
    const empty = log({ brand: null, model: null });
    expect(brandModelHint({ brand: "3M", model: "" }, empty)).toBe("changed");
  });

  it("週期改了或還沒填好時算不同", () => {
    expect(isSameCycle({ cycle: "60" }, latest)).toBe(false);
    expect(isSameCycle({ cycle: "" }, latest)).toBe(false);
  });
});

describe("buildDoneSubmission", () => {
  const base = initialDoneForm(log(), today);

  it("今天：更換日期是今天，不帶預計到期日", () => {
    const created = submitOk(base);
    expect(created.replacedOn).toBe("2026-09-10");
    expect(created.expectedDue).toBeNull();
    expect(created.cycleDays).toBe(90);
    expect(created.brand).toBe("3M");
  });

  it("其他日期：用選的日期", () => {
    const created = submitOk({
      ...base,
      date: "other",
      otherDate: "2026-09-01",
    });
    expect(created.replacedOn).toBe("2026-09-01");
  });

  it("其他日期不能晚於今天", () => {
    const errors = submitErrors({
      ...base,
      date: "other",
      otherDate: "2026-09-11",
    });
    expect(errors.otherDate).toBeDefined();
  });

  it.each(["", "0", "1.5", "abc"])("週期 %j 不合法", (cycle) => {
    expect(submitErrors({ ...base, cycle }).cycle).toBe("請填週期天數");
  });

  it("清掉品牌型號時存成 null", () => {
    const created = submitOk({ ...base, brand: " ", model: "" });
    expect(created.brand).toBeNull();
    expect(created.model).toBeNull();
  });
});

describe("becomesLatest", () => {
  const previous = log();

  it("日期較新時成為最近一筆", () => {
    const created = log({
      id: "log2" as LogId,
      replacedOn: "2026-09-10" as IsoDate,
      createdAt: "2026-09-10T10:00:00.000Z",
    });
    expect(becomesLatest(previous, created)).toBe(true);
  });

  it("同一天時較晚建立的成為最近一筆", () => {
    const created = log({
      id: "log2" as LogId,
      createdAt: "2026-09-10T10:00:00.000Z",
    });
    expect(becomesLatest(previous, created)).toBe(true);
  });

  it("日期早於上次更換時不是最近一筆", () => {
    const created = log({
      id: "log2" as LogId,
      replacedOn: "2026-05-01" as IsoDate,
      createdAt: "2026-09-10T10:00:00.000Z",
    });
    expect(becomesLatest(previous, created)).toBe(false);
  });

  it("上次日期未記錄時，有日期的新紀錄成為最近一筆", () => {
    const unknown = log({
      replacedOn: null,
      expectedDue: "2026-12-01" as IsoDate,
    } as Partial<Log>);
    const created = log({
      id: "log2" as LogId,
      replacedOn: "2026-01-01" as IsoDate,
      createdAt: "2026-09-10T10:00:00.000Z",
    });
    expect(becomesLatest(unknown, created)).toBe(true);
  });
});
