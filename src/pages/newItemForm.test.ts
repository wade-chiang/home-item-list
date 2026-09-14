import { describe, expect, it } from "vitest";
import type {
  Category,
  CategoryId,
  IsoDate,
  Item,
  ItemId,
  Location,
  LocationId,
} from "../shared/types.ts";
import {
  buildNewItemSubmission,
  hasDuplicate,
  initialNewItemForm,
  type NewItemFormState,
  previewName,
} from "./newItemForm.ts";

const today = "2026-09-10" as IsoDate;

const locations: Location[] = [
  { id: "loc1" as LocationId, name: "主臥", icon: "bed-double", sortOrder: 0 },
  { id: "loc2" as LocationId, name: "客廳", icon: "sofa", sortOrder: 1 },
];
const categories: Category[] = [
  {
    id: "cat1" as CategoryId,
    name: "冷氣濾網",
    icon: "air-vent",
    sortOrder: 0,
  },
];

function form(overrides: Partial<NewItemFormState> = {}): NewItemFormState {
  return {
    ...initialNewItemForm({ locations, categories, defaultLeadDays: 7, today }),
    cycle: "90",
    ...overrides,
  };
}

function submitOk(state: NewItemFormState) {
  const result = buildNewItemSubmission(state, today);
  if (!result.ok) {
    throw new Error(`預期通過驗證，實際錯誤：${JSON.stringify(result.errors)}`);
  }
  return result;
}

function submitErrors(state: NewItemFormState) {
  const result = buildNewItemSubmission(state, today);
  if (result.ok) {
    throw new Error("預期驗證失敗，實際通過");
  }
  return result.errors;
}

describe("initialNewItemForm", () => {
  it("預選排序第一個位置與類別、帶入預設提前提醒、週期不選", () => {
    const initial = initialNewItemForm({
      locations,
      categories,
      defaultLeadDays: 14,
      today,
    });
    expect(initial.locationId).toBe("loc1");
    expect(initial.categoryId).toBe("cat1");
    expect(initial.leadDays).toBe("14");
    expect(initial.cycle).toBe("");
    expect(initial.lastReplaced).toBe("today");
    expect(initial.nextDue).toBe("2026-11-09");
  });

  it("沒有位置或類別時留空", () => {
    const initial = initialNewItemForm({
      locations: [],
      categories: [],
      defaultLeadDays: 7,
      today,
    });
    expect(initial.locationId).toBe("");
    expect(initial.categoryId).toBe("");
  });
});

describe("hasDuplicate 與 previewName", () => {
  const existing: Item = {
    id: "item1" as ItemId,
    locationId: "loc1" as LocationId,
    categoryId: "cat1" as CategoryId,
    label: null,
    leadDays: 7,
    note: null,
    paused: false,
    pausedUntil: null,
    photos: [],
  };

  it("同位置同類別已有物品時為 true，換位置就不是", () => {
    expect(hasDuplicate(form(), [existing])).toBe(true);
    expect(hasDuplicate(form({ locationId: "loc2" }), [existing])).toBe(false);
  });

  it("預覽名稱：有補充名稱時接在最後", () => {
    expect(previewName(form(), locations, categories)).toBe("主臥 · 冷氣濾網");
    expect(previewName(form({ label: " 水槽 " }), locations, categories)).toBe(
      "主臥 · 冷氣濾網 · 水槽",
    );
  });
});

describe("buildNewItemSubmission：上次更換", () => {
  it("今天：更換日期是今天", () => {
    const { firstLog } = submitOk(form({ lastReplaced: "today" }));
    expect(firstLog.replacedOn).toBe("2026-09-10");
    expect(firstLog.expectedDue).toBeNull();
  });

  it("其他日期：用選的日期", () => {
    const { firstLog } = submitOk(
      form({ lastReplaced: "other", lastDate: "2026-08-01" }),
    );
    expect(firstLog.replacedOn).toBe("2026-08-01");
    expect(firstLog.expectedDue).toBeNull();
  });

  it("其他日期不能晚於今天", () => {
    const errors = submitErrors(
      form({ lastReplaced: "other", lastDate: "2026-09-11" }),
    );
    expect(errors.lastDate).toBeDefined();
  });

  it("不知道：日期留空，存預計到期日", () => {
    const { firstLog } = submitOk(
      form({ lastReplaced: "unknown", nextDue: "2026-12-01" }),
    );
    expect(firstLog.replacedOn).toBeNull();
    expect(firstLog.expectedDue).toBe("2026-12-01");
  });

  it("不知道時，預計到期日不能早於今天", () => {
    const errors = submitErrors(
      form({ lastReplaced: "unknown", nextDue: "2026-09-09" }),
    );
    expect(errors.nextDue).toBeDefined();
  });
});

describe("buildNewItemSubmission：週期與提前提醒", () => {
  it.each(["", "0", "abc", "1.5"])("週期 %j 不合法", (cycle) => {
    const errors = submitErrors(form({ cycle }));
    expect(errors.cycle).toContain("請選擇週期");
  });

  it("自訂週期可以用任意正整數", () => {
    const { firstLog } = submitOk(form({ cycle: "45", customCycle: true }));
    expect(firstLog.cycleDays).toBe(45);
  });

  it("提前提醒 0 天是合法值，不會被改成 7", () => {
    const { item } = submitOk(form({ leadDays: "0" }));
    expect(item.leadDays).toBe(0);
  });

  it.each(["", "-1", "1.5", "abc"])("提前提醒 %j 不合法", (leadDays) => {
    const errors = submitErrors(form({ leadDays }));
    expect(errors.leadDays).toBeDefined();
  });
});

describe("buildNewItemSubmission：選填文字", () => {
  it("去掉頭尾空白，沒填或只有空白時是 null", () => {
    const { item, firstLog } = submitOk(
      form({ label: " 水槽 ", brand: "  ", model: " 9808 ", note: "" }),
    );
    expect(item.label).toBe("水槽");
    expect(item.note).toBeNull();
    expect(firstLog.brand).toBeNull();
    expect(firstLog.model).toBe("9808");
  });

  it("新物品不是暫停狀態", () => {
    const { item } = submitOk(form());
    expect(item.paused).toBe(false);
    expect(item.pausedUntil).toBeNull();
  });

  it("沒有選位置時回報錯誤", () => {
    const errors = submitErrors(form({ locationId: "" }));
    expect(errors.location).toBeDefined();
  });
});
