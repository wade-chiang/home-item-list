import type { ItemStatus } from "../shared/types.ts";

// 狀態色條與天數文字的顏色，照 docs/prototype/p0.html 的 STRIPE、STTEXT。首頁與物品頁共用。

export const STRIPE_COLOR: Record<ItemStatus, string> = {
  overdue: "var(--overdue)",
  soon: "var(--soon)",
  ok: "var(--line)",
  paused: "var(--paused)",
};

export const DAYS_TEXT_COLOR: Record<ItemStatus, string> = {
  overdue: "var(--overdue)",
  soon: "var(--soon)",
  ok: "var(--ink-2)",
  paused: "var(--paused)",
};
