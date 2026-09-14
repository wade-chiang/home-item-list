import FieldError from "../components/FieldError.tsx";
import { INPUT_CLASS } from "../components/formStyles.ts";
import type { PurchaseFormErrors, PurchaseFormState } from "./purchaseForm.ts";

// 單價、數量、單位三格，版面照原型的 grid-cols-[1fr_68px_76px]。
// 「這次有買新的」（換好了、編輯更換紀錄）與新增物品頁的「花費」共用。

type Fields = Pick<PurchaseFormState, "price" | "quantity" | "unit">;

type Props = {
  form: Fields;
  errors: PurchaseFormErrors;
  onChange: (next: Fields) => void;
  /** 外層的間距與框線：兩個地方的原型不同 */
  className: string;
};

function PurchaseInputs({ form, errors, onChange, className }: Props) {
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className={className}>
      <div className="grid grid-cols-[1fr_68px_76px] gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="單價（元）"
          value={form.price}
          onChange={(event) => set("price", event.target.value)}
          placeholder="單價（元）"
          className={INPUT_CLASS}
        />
        <input
          type="number"
          inputMode="numeric"
          min={1}
          aria-label="數量"
          value={form.quantity}
          onChange={(event) => set("quantity", event.target.value)}
          className={INPUT_CLASS}
        />
        <input
          aria-label="單位"
          value={form.unit}
          onChange={(event) => set("unit", event.target.value)}
          placeholder="單位"
          className={INPUT_CLASS}
        />
      </div>
      <FieldError message={errors.price} />
      <FieldError message={errors.quantity} />
    </div>
  );
}

export default PurchaseInputs;
