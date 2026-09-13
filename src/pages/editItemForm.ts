import { CYCLE_PRESETS } from "../components/cyclePresets.ts";
import { isFilled } from "../shared/display.ts";
import type { CategoryId, Item, LocationId, Log } from "../shared/types.ts";
import {
  optionalText,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from "./formValues.ts";

// 編輯物品表單的狀態、驗證與送出資料。純函式，不含 React，方便單元測試。
// 版面與流程照 docs/prototype/p0.html 的 openEdit()、renderEdit()、saveEdit()。

export type EditItemFormState = {
  locationId: string;
  categoryId: string;
  label: string;
  brand: string;
  model: string;
  cycle: string;
  customCycle: boolean;
  leadDays: string;
  note: string;
};

export type EditItemFormErrors = Partial<
  Record<"location" | "category" | "cycle" | "leadDays", string>
>;

export type EditItemSubmission =
  | { ok: true; item: Item; latestLog: Log }
  | { ok: false; errors: EditItemFormErrors };

/** 物品的欄位來自物品本身；品牌、型號、週期來自最近一筆更換紀錄（PRODUCT.md §4.5） */
export function initialEditItemForm(
  item: Item,
  latestLog: Log,
): EditItemFormState {
  return {
    locationId: item.locationId,
    categoryId: item.categoryId,
    label: isFilled(item.label) ? item.label : "",
    brand: isFilled(latestLog.brand) ? latestLog.brand : "",
    model: isFilled(latestLog.model) ? latestLog.model : "",
    cycle: String(latestLog.cycleDays),
    customCycle: !CYCLE_PRESETS.includes(latestLog.cycleDays),
    leadDays: String(item.leadDays),
    note: isFilled(item.note) ? item.note : "",
  };
}

/** 除了這個物品自己以外，同位置、同類別還有別的物品：提示填補充名稱（照原型，只提示不擋存檔） */
export function hasOtherDuplicate(
  form: Pick<EditItemFormState, "locationId" | "categoryId">,
  items: readonly Item[],
  itemId: Item["id"],
): boolean {
  return items.some(
    (other) =>
      other.id !== itemId &&
      other.locationId === form.locationId &&
      other.categoryId === form.categoryId,
  );
}

/**
 * 組出要寫回的物品與最近一筆更換紀錄。沒有出現在表單上的欄位（暫停狀態、更換日期等）沿用原值。
 */
export function buildEditItemSubmission(
  form: EditItemFormState,
  item: Item,
  latestLog: Log,
): EditItemSubmission {
  const errors: EditItemFormErrors = {};

  if (form.locationId === "") {
    errors.location = "請選擇位置";
  }
  if (form.categoryId === "") {
    errors.category = "請選擇類別";
  }

  const cycleDays = parsePositiveInteger(form.cycle);
  if (cycleDays === null) {
    // 文字照原型
    errors.cycle = "請選擇週期";
  }

  // 0 是合法值。不照抄原型的 parseInt(E.lead,10)||it.leadDays：那會把 0 改回原值（同 P1-14 的原型缺陷）
  const leadDays = parseNonNegativeInteger(form.leadDays);
  if (leadDays === null) {
    errors.leadDays = "請填 0 以上的整數";
  }

  if (
    cycleDays === null ||
    leadDays === null ||
    Object.keys(errors).length > 0
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    item: {
      ...item,
      locationId: form.locationId as LocationId,
      categoryId: form.categoryId as CategoryId,
      label: optionalText(form.label),
      leadDays,
      note: optionalText(form.note),
    },
    latestLog: {
      ...latestLog,
      brand: optionalText(form.brand),
      model: optionalText(form.model),
      cycleDays,
    },
  };
}
