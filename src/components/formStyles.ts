// 表單共用樣式，照 docs/prototype/p0.html 的 LBL、INP、chip()。
// 原型的 nowrap 是自訂 class，這裡改用 Tailwind 的 whitespace-nowrap；
// 原型的 focus:outline-none 在 Tailwind v4 改名為 focus:outline-hidden（CLAUDE.md 決策紀錄）。

export const LABEL_CLASS = "mb-1.5 block text-[13px] font-medium text-ink-2";

export const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-hidden";

/** 選項按鈕（原型的 chip）。mono 用在數字選項，例如週期天數 */
export function chipClass(selected: boolean, mono = false): string {
  return `whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-[14px] ${mono ? "font-mono tabular-nums" : ""} ${selected ? "border-ink bg-ink text-ground" : "border-line bg-surface text-ink"}`;
}
