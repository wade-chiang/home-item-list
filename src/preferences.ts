// 這支手機自己的偏好（PRODUCT.md §4.6「存在手機本機」）。不是 PocketBase 的資料，所以不放 src/repo/。
// 存在 localStorage：P3 包成 Capacitor app 後 WebView 裡仍可用，要不要改用偏好設定外掛到 P3 再評估。

export type ThemePreference = "system" | "light" | "dark";

/**
 * localStorage 的 key。index.html 裡在畫面出現前套用外觀的那段 script 寫死同一個字串，改名時兩邊要一起改
 */
export const THEME_STORAGE_KEY = "home-item-list.theme";

/** 存的值不認得（沒存過、被手動改過）時一律當成跟隨系統 */
export function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // 無痕模式或禁止網站資料時 localStorage 可能丟錯；也包含路由測試的 Node 環境（沒有 localStorage）
    return "system";
  }
}

/** 存起來並立刻套用。存不進去時仍然套用，只是下次開啟不會記得 */
export function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // 見 readThemePreference
  }
  applyThemePreference(preference);
}

/** 跟隨系統時拿掉 data-theme，交給 index.css 的 prefers-color-scheme；選了淺色或深色時標在根元素上 */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

/** localStorage 的 key。只有畫面載入後才讀，不需要在 index.html 提前套用 */
export const ITEM_ICONS_STORAGE_KEY = "home-item-list.itemIcons";

/** 列表是否顯示物品的 icon（P2-12，PRODUCT.md §4.6）。預設開啟；只有存的是 "off" 才關閉 */
export function parseItemIconsPreference(value: string | null): boolean {
  return value !== "off";
}

export function readItemIconsPreference(): boolean {
  try {
    return parseItemIconsPreference(
      localStorage.getItem(ITEM_ICONS_STORAGE_KEY),
    );
  } catch {
    // 見 readThemePreference
    return true;
  }
}

/** 存不進去時不丟錯：這次照樣切換，只是下次開啟不會記得 */
export function saveItemIconsPreference(show: boolean): void {
  try {
    if (show) {
      localStorage.removeItem(ITEM_ICONS_STORAGE_KEY);
    } else {
      localStorage.setItem(ITEM_ICONS_STORAGE_KEY, "off");
    }
  } catch {
    // 見 readThemePreference
  }
}
