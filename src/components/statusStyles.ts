import type { ItemStatus } from "../shared/types.ts";

// 狀態色條與天數文字的顏色，照 docs/prototype/p0.html 的 STRIPE、STTEXT。首頁與物品頁共用。

export const STRIPE_COLOR: Record<ItemStatus, string> = {
  overdue: "var(--overdue)",
  soon: "var(--soon)",
  ok: "var(--line)",
  paused: "var(--paused)",
};

/** 狀態標籤的文字，照原型的 STLABEL */
export const STATUS_LABEL: Record<ItemStatus, string> = {
  overdue: "逾期",
  soon: "即將到期",
  ok: "正常",
  paused: "暫停中",
};

/** 狀態標籤的底色與文字色，照原型的 BADGE */
export const STATUS_BADGE_CLASS: Record<ItemStatus, string> = {
  overdue: "bg-overdue-soft text-overdue",
  soon: "bg-soon-soft text-soon",
  ok: "bg-line-2 text-ink-2",
  paused: "bg-line-2 text-paused",
};

export const DAYS_TEXT_COLOR: Record<ItemStatus, string> = {
  overdue: "var(--overdue)",
  soon: "var(--soon)",
  ok: "var(--ink-2)",
  paused: "var(--paused)",
};
