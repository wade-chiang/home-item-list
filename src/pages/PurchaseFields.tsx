import { Check } from "lucide-react";
import type { PurchaseFormErrors, PurchaseFormState } from "./purchaseForm.ts";
import PurchaseInputs from "./PurchaseInputs.tsx";

// 「這次有買新的」勾選框與單價、數量、單位，版面照 docs/prototype/p0.html 的 data-bought 區塊。
// 換好了面板（P2-7）與編輯更換紀錄面板（P2-8）共用。
// 勾了才顯示輸入欄；不勾 = 用既有存貨，不建立採購紀錄（PRODUCT.md §5.2）。

type Props = {
  form: PurchaseFormState;
  errors: PurchaseFormErrors;
  onChange: (next: PurchaseFormState) => void;
};

function PurchaseFields({ form, errors, onChange }: Props) {
  return (
    <>
      <button
        type="button"
        role="checkbox"
        aria-checked={form.bought}
        onClick={() => onChange({ ...form, bought: !form.bought })}
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-left text-[14px]"
      >
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${form.bought ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
        >
          {form.bought && <Check size={14} strokeWidth={2.5} aria-hidden />}
        </span>
        這次有買新的
      </button>
      {form.bought && (
        <PurchaseInputs
          form={form}
          errors={errors}
          onChange={(fields) => onChange({ ...form, ...fields })}
          className="mt-2"
        />
      )}
    </>
  );
}

export default PurchaseFields;
