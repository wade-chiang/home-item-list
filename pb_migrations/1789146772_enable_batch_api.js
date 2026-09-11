/// <reference path="../pb_data/types.d.ts" />

// 開啟 batch API：「新增物品同時寫入第一筆更換紀錄」需要在同一個交易完成
// （CLAUDE.md「PocketBase 有兩個預設值要改」）。v0.40.3 預設關閉。
// 其他 batch 設定（maxRequests 50、timeout 3 秒）沿用預設。
migrate(
  (app) => {
    const settings = app.settings();
    settings.batch.enabled = true;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.batch.enabled = false;
    app.save(settings);
  },
);
