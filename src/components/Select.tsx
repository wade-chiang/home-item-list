import { ChevronDown } from "lucide-react";
import { INPUT_CLASS } from "./formStyles.ts";

/** 原型的 selectHTML()：原生下拉選單加上右側的箭頭 */
function Select({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} appearance-none pr-9`}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </div>
  );
}

export default Select;
