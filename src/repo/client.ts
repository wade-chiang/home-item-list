import PocketBase from "pocketbase";

// 全專案唯一建立 PocketBase 連線的地方（CLAUDE.md 紀律 1）。
// 連到 "/"：部署時前端與 API 同源（PocketBase 一併提供 pb_public）；開發時由 vite.config.ts 把 /api 轉到本機的 PocketBase。
export const pb = new PocketBase("/");

// SDK 預設會取消「同一個方法＋路徑」還在等回應的請求。
// listLogs 與 listLogsByItem 打同一個路徑，同時發出會互相取消，所以關掉（CLAUDE.md「PocketBase 有幾個預設值要改」）。
pb.autoCancellation(false);
