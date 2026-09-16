// 配色清單（P2-15）。實際的顏色定義在 src/index.css，這裡只放畫面上要用的名稱、說明與預覽色塊，
// 改配色時兩邊要一起改。色塊照原型 docs/prototype/p0.html 的順序：底色、卡片、主色、逾期、即將到期。

export type PaletteMode = "light" | "dark";

export type Palette = {
  id: string;
  name: string;
  description: string;
  /** 預覽用，順序同上；只是色塊，畫面其他地方一律用 CSS 變數 */
  swatch: readonly [string, string, string, string, string];
};

/** 每個模式的第一組是預設，選它時不寫 data-palette-* 屬性 */
export const PALETTES: Record<PaletteMode, readonly Palette[]> = {
  light: [
    {
      id: "slate",
      name: "石板藍灰",
      description: "藍灰底、靛藍主色",
      swatch: ["#eef1f5", "#fafbfd", "#3b4fa0", "#b3372f", "#87590a"],
    },
    {
      id: "sand",
      name: "暖米白",
      description: "暖米白底、深青主色",
      swatch: ["#f6f3ee", "#fffdf9", "#0b5750", "#b23a2e", "#8a5a0b"],
    },
    {
      id: "paper",
      name: "紙白墨藍",
      description: "冷調灰白底、墨藍主色",
      swatch: ["#f4f5f7", "#ffffff", "#1f4a7a", "#b42f2a", "#8a5b00"],
    },
    {
      id: "mint",
      name: "薄荷濾網",
      description: "淡綠灰底、森林綠主色",
      swatch: ["#f1f5f2", "#fbfdfb", "#2f6b45", "#b23a2e", "#86590c"],
    },
    {
      id: "mono",
      name: "純白高對比",
      description: "白底、近黑主色",
      swatch: ["#ffffff", "#ffffff", "#111111", "#c0271c", "#946000"],
    },
  ],
  dark: [
    {
      id: "deepsea",
      name: "深海藍",
      description: "深藍黑底、淡青藍主色",
      swatch: ["#0b1220", "#131c2e", "#6cc4e8", "#f47a6c", "#e3ae4c"],
    },
    {
      id: "forest",
      name: "墨綠黑",
      description: "墨綠黑底、青綠主色",
      swatch: ["#0e1412", "#18201d", "#43b3a6", "#f2705f", "#d9a33a"],
    },
    {
      id: "charcoal",
      name: "中性炭灰",
      description: "不帶色偏的深灰、天藍主色",
      swatch: ["#121212", "#1c1c1e", "#5aaef0", "#f27062", "#e0a93f"],
    },
    {
      id: "oled",
      name: "OLED 純黑",
      description: "純黑底、薄荷主色，對比最高",
      swatch: ["#000000", "#111413", "#5fd3b3", "#ff7566", "#e8b04a"],
    },
    {
      id: "ember",
      name: "暖炭",
      description: "帶暖色的深灰、鼠尾草綠主色",
      swatch: ["#151311", "#1f1c19", "#8fbf9a", "#ef7361", "#dca640"],
    },
  ],
};

export function defaultPaletteId(mode: PaletteMode): string {
  return PALETTES[mode][0].id;
}

export function findPalette(mode: PaletteMode, id: string): Palette {
  return (
    PALETTES[mode].find((palette) => palette.id === id) ?? PALETTES[mode][0]
  );
}
