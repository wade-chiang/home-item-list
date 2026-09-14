/// <reference path="../pb_data/types.d.ts" />

// PocketBase 伺服器端的排程備份（P2-13 確認）：每天台北時間凌晨 3 點，保留最近 7 份。
// PocketBase 的排程用 UTC（v0.40.3 tools/cron/cron.go 預設 time.UTC），台北 03:00 = UTC 19:00。
// 備份存在 pb_data/backups，跟資料在同一個資料夾：整個 pb_data 被刪時救不了，手動複製 pb_data 到別處的做法仍要保留。
// 這份備份只防「app 裡誤刪或還原錯檔」；要搬到別台或 P3 的 app，用 app 內的匯出備份。
migrate(
  (app) => {
    const settings = app.settings();
    settings.backups.cron = "0 19 * * *";
    settings.backups.cronMaxKeep = 7;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.backups.cron = "";
    settings.backups.cronMaxKeep = 3;
    app.save(settings);
  },
);
