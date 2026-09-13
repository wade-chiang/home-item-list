// 新增位置、類別的規則。純函式，不含 React，方便單元測試。
// 流程照 docs/prototype/p0.html 的 openEditPlace()；改名在 P1-19，自選 icon、刪除、調整順序在 P2-11。

export type PlaceKind = "location" | "category";

export const PLACE_WORD: Record<PlaceKind, string> = {
  location: "位置",
  category: "類別",
};

/**
 * 新增時的 icon（P1-15a 確認）。原型預設是精選清單第一個（位置 sofa、類別 air-vent），
 * 在還不能自選 icon 時，新增「陽台」會出現沙發、「除濕機」會出現冷氣出風口，看起來像資料錯了，所以改用不指涉特定東西的 icon。
 */
export const DEFAULT_PLACE_ICON: Record<PlaceKind, string> = {
  location: "house",
  category: "package",
};

/** 新項目排在最後：目前最大的 sortOrder + 1，沒有任何項目時從 0 開始 */
export function nextSortOrder(
  places: readonly { sortOrder: number }[],
): number {
  return places.reduce((max, place) => Math.max(max, place.sortOrder + 1), 0);
}

export type PlaceNameResult =
  { ok: true; name: string } | { ok: false; error: string };

/**
 * 名稱去掉頭尾空白後不能空白、不能跟現有的重複（文字照原型）。
 * 資料庫沒有唯一限制，重複只在這裡擋。
 */
export function validatePlaceName(
  input: string,
  kind: PlaceKind,
  existing: readonly { name: string }[],
): PlaceNameResult {
  const name = input.trim();
  if (name === "") {
    return { ok: false, error: `請填${PLACE_WORD[kind]}名稱` };
  }
  if (existing.some((place) => place.name.trim() === name)) {
    return { ok: false, error: `已經有「${name}」了` };
  }
  return { ok: true, name };
}
