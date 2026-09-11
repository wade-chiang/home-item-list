/// <reference path="../pb_data/types.d.ts" />

// P1-5：建立六個 collection，欄位依 docs/PRODUCT.md §2。
// 手寫而非從後台點選：每一行都能在 git 裡檢視，欄位設定與規格逐項對應。
migrate(
  (app) => {
    // 前端沒有登入機制，rule 必須是空字串（任何人可存取）。
    // 留 null 的話只有管理員能存取，前端會全部 403。這台機器不可對外暴露（CLAUDE.md）。
    const openRules = {
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    };

    // 領域層日期一律是 YYYY-MM-DD（CLAUDE.md「日期只存日期」）。
    // PocketBase 對空字串不檢查 pattern，所以可空的日期欄位留空不會被擋。
    // 只檢查格式，擋不住 2026-02-30 這種不存在的日期。
    const datePattern = "^\\d{4}-\\d{2}-\\d{2}$";

    // 用 JS 建立的 base collection 只有 id 欄位，created / updated 要自己加。
    // logs「同一天有多筆時，較晚建立的為較新」靠 created 判斷。
    const timestamps = () => [
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ];

    // 不用物件展開語法（...）：PocketBase 的 JS 執行環境（goja）對新語法的支援我沒有查證。
    const collection = (name, fields, extra) =>
      new Collection(
        Object.assign(
          { type: "base", name: name, fields: fields.concat(timestamps()) },
          openRules,
          extra || {},
        ),
      );

    const locations = collection("locations", [
      { type: "text", name: "householdId" },
      { type: "text", name: "name", required: true },
      { type: "text", name: "icon", required: true },
      { type: "number", name: "sortOrder", onlyInt: true },
    ]);
    app.save(locations);

    const categories = collection("categories", [
      { type: "text", name: "householdId" },
      { type: "text", name: "name", required: true },
      { type: "text", name: "icon", required: true },
      { type: "number", name: "sortOrder", onlyInt: true },
    ]);
    app.save(categories);

    // number 欄位的 required 意思是「不能是 0」（CLAUDE.md「型別要自己顧」）：
    // 只有 0 沒有意義的欄位設 required；leadDays、unitPrice 的 0 有意義，改設 min 0。
    const items = collection("items", [
      { type: "text", name: "householdId" },
      // 必填且不連帶刪除：還有物品時，刪除位置或類別會被 PocketBase 拒絕（PRODUCT.md §4.6）
      {
        type: "relation",
        name: "location",
        collectionId: locations.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        type: "relation",
        name: "category",
        collectionId: categories.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { type: "text", name: "label" },
      { type: "number", name: "leadDays", onlyInt: true, min: 0 },
      { type: "text", name: "note" },
      { type: "bool", name: "paused" },
      { type: "text", name: "pausedUntil", pattern: datePattern },
      // 前端上傳前一律轉 JPEG（CLAUDE.md「照片存 JPEG」）
      { type: "file", name: "photos", maxSelect: 5, mimeTypes: ["image/jpeg"] },
    ]);
    app.save(items);

    // 要比 logs 早建立：logs.purchase 引用它
    const purchases = collection("purchases", [
      { type: "text", name: "householdId" },
      { type: "number", name: "unitPrice", onlyInt: true, min: 0 },
      {
        type: "number",
        name: "quantity",
        required: true,
        onlyInt: true,
        min: 1,
      },
      { type: "text", name: "unit" },
      { type: "text", name: "note" },
    ]);
    app.save(purchases);

    const logs = collection("logs", [
      // 刪除物品時連帶刪除它的更換紀錄（PRODUCT.md §5.5）
      {
        type: "relation",
        name: "item",
        collectionId: items.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
      },
      { type: "text", name: "replacedOn", pattern: datePattern },
      { type: "text", name: "expectedDue", pattern: datePattern },
      {
        type: "number",
        name: "cycleDays",
        required: true,
        onlyInt: true,
        min: 1,
      },
      { type: "text", name: "brand" },
      { type: "text", name: "model" },
      { type: "file", name: "photos", maxSelect: 2, mimeTypes: ["image/jpeg"] },
      { type: "text", name: "note" },
      // 可空：空 = 這次用既有存貨（PRODUCT.md §2）
      {
        type: "relation",
        name: "purchase",
        collectionId: purchases.id,
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
      },
    ]);
    app.save(logs);

    const settings = collection(
      "settings",
      [
        { type: "text", name: "key", required: true },
        { type: "text", name: "value" },
      ],
      // 同一個 key 只能有一筆
      { indexes: ["CREATE UNIQUE INDEX idx_settings_key ON settings (key)"] },
    );
    app.save(settings);

    // 新物品預設提前提醒天數（PRODUCT.md §2）。放進資料庫，程式碼裡不再另記一份預設值
    const defaultLeadDays = new Record(settings);
    defaultLeadDays.set("key", "defaultLeadDays");
    defaultLeadDays.set("value", "7");
    app.save(defaultLeadDays);
  },
  (app) => {
    // 依相依關係反向刪除
    const names = [
      "settings",
      "logs",
      "purchases",
      "items",
      "categories",
      "locations",
    ];
    for (const name of names) {
      app.delete(app.findCollectionByNameOrId(name));
    }
  },
);
