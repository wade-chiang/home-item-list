import type { NewPurchase } from "../repo/index.ts";
import { isFilled } from "../shared/display.ts";
import type { Purchase } from "../shared/types.ts";
import {
  optionalText,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from "./formValues.ts";

// 採購欄位（單價、數量、單位）的狀態與驗證。純函式，不含 React，方便單元測試。
// 換好了面板的「這次有買新的」（P2-7）用；新增物品的花費與編輯更換紀錄的價格（P2-8）也會沿用。

export type PurchaseFormState = {
  /** 有勾「這次有買新的」才建立採購紀錄；不勾 = 用既有存貨（PRODUCT.md §5.2） */
  bought: boolean;
  price: string;
  quantity: string;
  unit: string;
};

export type PurchaseFormErrors = Partial<Record<"price" | "quantity", string>>;

export type PurchaseSubmission =
  | { ok: true; purchase: NewPurchase | null }
  | { ok: false; errors: PurchaseFormErrors };

/** 數量預設 1（照原型） */
export function initialPurchaseForm(): PurchaseFormState {
  return { bought: false, price: "", quantity: "1", unit: "" };
}

export function buildPurchase(form: PurchaseFormState): PurchaseSubmission {
  if (!form.bought) {
    return { ok: true, purchase: null };
  }

  const errors: PurchaseFormErrors = {};
  // 勾了卻沒填單價時提示，不默默略過（P2-6 確認）：原型會不建立採購紀錄，使用者不會發現。0 是贈品，合法
  const unitPrice = parseNonNegativeInteger(form.price);
  if (unitPrice === null) {
    errors.price = "請填單價，贈品填 0";
  }
  const quantity = parsePositiveInteger(form.quantity);
  if (quantity === null) {
    errors.quantity = "數量請填 1 以上的整數";
  }

  if (unitPrice === null || quantity === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    // 採購的備註目前沒有畫面用到（P2-6 確認不做）
    purchase: {
      unitPrice,
      quantity,
      unit: optionalText(form.unit),
      note: null,
    },
  };
}

/** 編輯更換紀錄時的初始值：這筆有採購紀錄就勾選並帶入原本的值（照原型） */
export function purchaseFormFrom(purchase: Purchase | null): PurchaseFormState {
  if (purchase === null) {
    return initialPurchaseForm();
  }
  return {
    bought: true,
    price: String(purchase.unitPrice),
    quantity: String(purchase.quantity),
    unit: isFilled(purchase.unit) ? purchase.unit : "",
  };
}

/**
 * 新增物品頁的「花費」：沒有勾選框，看有沒有填單價決定（P2-8 確認）。
 * 單價沒填、但數量或單位動過（不是預設的 1 與空白）就提示，不默默略過；都沒動就不建立。
 * 區塊收合不影響判斷：收合時不清空已填的內容
 */
export function buildCostPurchase(
  form: Omit<PurchaseFormState, "bought">,
): PurchaseSubmission {
  const touched =
    form.price.trim() !== "" ||
    form.quantity.trim() !== "1" ||
    form.unit.trim() !== "";
  return buildPurchase({ ...form, bought: touched });
}
