import type { NewItem, NewLog } from "../repo/index.ts";
import { addDays } from "../shared/date.ts";
import { displayName, isFilled } from "../shared/display.ts";
import type {
  Category,
  CategoryId,
  IsoDate,
  Item,
  Location,
  LocationId,
} from "../shared/types.ts";

// 新增物品表單的狀態、驗證與送出資料。純函式，不含 React，方便單元測試。
// 版面與流程照 docs/prototype/p0.html 的 renderAdd()、submitAdd()。

/** 週期的快速選項（原型的 PRE） */
export const CYCLE_PRESETS = [30, 60, 90, 180, 365] as const;

export type LastReplaced = "today" | "other" | "unknown";

/** 表單欄位的原始值。輸入框的值都是字串，送出時才轉型與驗證 */
export type NewItemFormState = {
  locationId: string;
  categoryId: string;
  brand: string;
  model: string;
  label: string;
  labelOpen: boolean;
  lastReplaced: LastReplaced;
  lastDate: string;
  nextDue: string;
  cycle: string;
  customCycle: boolean;
  leadDays: string;
  note: string;
};

export type NewItemFormErrors = Partial<
  Record<
    "location" | "category" | "lastDate" | "nextDue" | "cycle" | "leadDays",
    string
  >
>;

export type NewItemSubmission =
  | { ok: true; item: NewItem; firstLog: NewLog }
  | { ok: false; errors: NewItemFormErrors };

export function initialNewItemForm({
  locations,
  categories,
  defaultLeadDays,
  today,
}: {
  locations: readonly Location[];
  categories: readonly Category[];
  defaultLeadDays: number;
  today: IsoDate;
}): NewItemFormState {
  return {
    // 位置、類別預選排序第一個（P1-14 確認，照原型下拉選單有預選值）
    locationId: locations.length > 0 ? locations[0].id : "",
    categoryId: categories.length > 0 ? categories[0].id : "",
    brand: "",
    model: "",
    label: "",
    labelOpen: false,
    lastReplaced: "today",
    lastDate: today,
    // 原型預設「下次大概什麼時候要換」是 60 天後
    nextDue: addDays(today, 60),
    // 週期預設不選：同一種耗材放在不同地方週期也不同，要使用者自己決定（原型）
    cycle: "",
    customCycle: false,
    leadDays: String(defaultLeadDays),
    note: "",
  };
}

/** 同位置、同類別已經有物品：補充名稱要自動展開並提示（PRODUCT.md §4.4） */
export function hasDuplicate(
  form: Pick<NewItemFormState, "locationId" | "categoryId">,
  items: readonly Item[],
): boolean {
  return items.some(
    (item) =>
      item.locationId === form.locationId &&
      item.categoryId === form.categoryId,
  );
}

/** 「會顯示為 主臥 · 冷氣濾網 · 水槽」的預覽 */
export function previewName(
  form: Pick<NewItemFormState, "locationId" | "categoryId" | "label">,
  locations: readonly Location[],
  categories: readonly Category[],
): string {
  const location = locations.find((l) => l.id === form.locationId);
  const category = categories.find((c) => c.id === form.categoryId);
  return displayName(
    location?.name ?? "",
    category?.name ?? "",
    form.label.trim(),
  );
}

const NON_NEGATIVE_INTEGER = /^\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 選填文字：去掉頭尾空白，沒填時是 null（CLAUDE.md「型別要自己顧」） */
function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return isFilled(trimmed) ? trimmed : null;
}

export function buildNewItemSubmission(
  form: NewItemFormState,
  today: IsoDate,
): NewItemSubmission {
  const errors: NewItemFormErrors = {};

  if (form.locationId === "") {
    errors.location = "請選擇位置";
  }
  if (form.categoryId === "") {
    errors.category = "請選擇類別";
  }

  // YYYY-MM-DD 的字串順序就是日期先後，可以直接比較
  if (form.lastReplaced === "other") {
    if (!ISO_DATE.test(form.lastDate)) {
      errors.lastDate = "請選擇上次更換的日期";
    } else if (form.lastDate > today) {
      errors.lastDate = "上次更換日不能晚於今天";
    }
  }
  if (form.lastReplaced === "unknown") {
    if (!ISO_DATE.test(form.nextDue)) {
      errors.nextDue = "請選擇預計要換的日期";
    } else if (form.nextDue < today) {
      errors.nextDue = "預計要換的日期不能早於今天";
    }
  }

  const cycleText = form.cycle.trim();
  if (!NON_NEGATIVE_INTEGER.test(cycleText) || Number(cycleText) < 1) {
    // 文字照原型
    errors.cycle =
      "請選擇週期。同一種耗材放在不同地方，更換頻率也不同，所以每個物品都要自己設。";
  }

  // 0 是合法值，表示到期當天才提醒。不照抄原型的 parseInt(F.lead,10)||7：
  // 那會把 0 當成沒填改成 7（TASKS.md P1-14 記錄的原型缺陷）
  const leadText = form.leadDays.trim();
  if (!NON_NEGATIVE_INTEGER.test(leadText)) {
    errors.leadDays = "請填 0 以上的整數";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const item: NewItem = {
    locationId: form.locationId as LocationId,
    categoryId: form.categoryId as CategoryId,
    label: optionalText(form.label),
    leadDays: Number(leadText),
    note: optionalText(form.note),
    paused: false,
    pausedUntil: null,
  };

  const logBase = {
    cycleDays: Number(cycleText),
    brand: optionalText(form.brand),
    model: optionalText(form.model),
    note: null,
    purchaseId: null,
  };

  // 選「不知道」時日期留空、存預計到期日；仍然建立第一筆更換紀錄（CLAUDE.md「每個物品至少一筆更換紀錄」）
  const firstLog: NewLog =
    form.lastReplaced === "unknown"
      ? { ...logBase, replacedOn: null, expectedDue: form.nextDue as IsoDate }
      : {
          ...logBase,
          replacedOn:
            form.lastReplaced === "today" ? today : (form.lastDate as IsoDate),
          expectedDue: null,
        };

  return { ok: true, item, firstLog };
}
