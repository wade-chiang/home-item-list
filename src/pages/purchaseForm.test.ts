import { describe, expect, it } from "vitest";
import type { PurchaseId } from "../shared/types.ts";
import {
  buildCostPurchase,
  buildPurchase,
  initialPurchaseForm,
  purchaseFormFrom,
} from "./purchaseForm.ts";

describe("buildPurchase", () => {
  const base = initialPurchaseForm();

  it("沒勾這次有買新的時不建立採購紀錄，其他欄位不驗證", () => {
    expect(buildPurchase({ ...base, price: "abc" })).toEqual({
      ok: true,
      purchase: null,
    });
  });

  it("勾了就組出採購紀錄；單位去掉空白，沒填是 null", () => {
    expect(
      buildPurchase({
        bought: true,
        price: "400",
        quantity: "2",
        unit: " 捲 ",
      }),
    ).toEqual({
      ok: true,
      purchase: { unitPrice: 400, quantity: 2, unit: "捲", note: null },
    });
    expect(buildPurchase({ ...base, bought: true, price: "0" })).toMatchObject({
      ok: true,
      purchase: { unitPrice: 0, unit: null },
    });
  });

  it("勾了卻沒填單價時提示，不默默略過", () => {
    expect(buildPurchase({ ...base, bought: true })).toEqual({
      ok: false,
      errors: { price: "請填單價，贈品填 0" },
    });
  });

  it.each(["0", "", "1.5"])("數量 %j 不合法", (quantity) => {
    const result = buildPurchase({
      ...base,
      bought: true,
      price: "100",
      quantity,
    });
    expect(!result.ok && result.errors.quantity).toBe("數量請填 1 以上的整數");
  });
});

describe("buildCostPurchase（新增物品頁的花費）", () => {
  const empty = { price: "", quantity: "1", unit: "" };

  it("都沒動就不建立", () => {
    expect(buildCostPurchase(empty)).toEqual({ ok: true, purchase: null });
  });

  it("有填單價就建立", () => {
    expect(buildCostPurchase({ ...empty, price: "150" })).toMatchObject({
      ok: true,
      purchase: { unitPrice: 150, quantity: 1 },
    });
  });

  it("沒填單價但動了數量或單位，提示填單價", () => {
    expect(buildCostPurchase({ ...empty, unit: "片" }).ok).toBe(false);
    expect(buildCostPurchase({ ...empty, quantity: "3" }).ok).toBe(false);
  });
});

describe("purchaseFormFrom", () => {
  it("有採購紀錄時勾選並帶入原本的值", () => {
    expect(
      purchaseFormFrom({
        id: "p1" as PurchaseId,
        unitPrice: 400,
        quantity: 2,
        unit: null,
        note: null,
      }),
    ).toEqual({ bought: true, price: "400", quantity: "2", unit: "" });
  });

  it("沒有時不勾", () => {
    expect(purchaseFormFrom(null)).toEqual(initialPurchaseForm());
  });
});
