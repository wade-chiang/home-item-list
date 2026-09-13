/// <reference path="../pb_data/types.d.ts" />

// batch 一次最多的請求數：預設 50 調到 1000（P1-17 確認）。
// 刪除物品後的「復原」要把物品和它所有的更換紀錄放在同一個 batch 寫回，
// 預設 50 時更換紀錄超過 49 筆的物品就無法復原（7 天週期不到一年就會碰到）。
// 1000 時上限是 999 筆。這個限制只存在 PocketBase 期間，P3 換成裝置 SQLite 後用本機交易，沒有這個上限。
migrate(
  (app) => {
    const settings = app.settings();
    settings.batch.maxRequests = 1000;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.batch.maxRequests = 50;
    app.save(settings);
  },
);
