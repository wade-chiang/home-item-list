/** 原型的 kv()：左邊標題、右邊值，可加一行小字說明。詳情頁與備份面板共用 */
function KeyValueRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-t border-line-2 py-2.5 first:border-t-0">
      <span className="shrink-0 whitespace-nowrap text-[13.5px] text-ink-3">
        {label}
      </span>
      <span className="text-right text-[14px]">
        {value}
        {hint !== undefined && (
          <span className="block font-mono text-[11.5px] text-ink-3">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

export default KeyValueRow;
