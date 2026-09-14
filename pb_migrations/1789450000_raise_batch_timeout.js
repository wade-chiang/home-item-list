/// <reference path="../pb_data/types.d.ts" />

// batch 交易逾時：預設 3 秒調到 30 秒（P2-13 確認）。
// 還原備份時要在同一個 batch 裡清空全部資料，再把紀錄與照片整批寫回，照片多時可能超過 3 秒。
// 30 秒是估計值，還原實測時確認。這個限制只存在 PocketBase 期間，P3 換成裝置 SQLite 後用本機交易。
migrate(
  (app) => {
    const settings = app.settings();
    settings.batch.timeout = 30;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.batch.timeout = 3;
    app.save(settings);
  },
);
