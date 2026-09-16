import { Check } from "lucide-react";
import { useId } from "react";
import BottomSheet from "../components/BottomSheet.tsx";
import { type Palette, type PaletteMode, PALETTES } from "../palettes.ts";

// 配色面板（P2-15），版面照 docs/prototype/p0.html 的 openPalette()（PRODUCT.md §4.6）。
// 選了立刻套用、面板不關，可以連著比較。選到的值由設定頁保管，面板本身沒有狀態

const MODE_LABEL: Record<PaletteMode, string> = { light: "淺色", dark: "深色" };

function Swatch({ palette }: { palette: Palette }) {
  return (
    <span
      className="flex shrink-0 overflow-hidden rounded-lg border"
      style={{ borderColor: palette.swatch[1] }}
    >
      {palette.swatch.map((color, index) => (
        <span
          key={`${palette.id}-${String(index)}`}
          className="block h-8 w-4"
          style={{ background: color }}
        />
      ))}
    </span>
  );
}

type Props = {
  selected: Record<PaletteMode, string>;
  onSelect: (mode: PaletteMode, id: string) => void;
  onClose: () => void;
};

function PaletteSheet({ selected, onSelect, onClose }: Props) {
  const id = useId();

  return (
    <BottomSheet onClose={onClose} labelledBy={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-[18px] font-semibold">
        配色
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
        淺色、深色分開挑，選了立刻套用。色塊依序是底色、卡片、主色、逾期、即將到期。
      </p>
      {(["light", "dark"] as const).map((mode) => (
        <div key={mode}>
          <div className="mt-4 text-[13px] font-medium text-ink-2">
            {MODE_LABEL[mode]}
          </div>
          <div className="mt-1.5 flex flex-col gap-2">
            {PALETTES[mode].map((palette) => {
              const isSelected = palette.id === selected[mode];
              return (
                <button
                  key={palette.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(mode, palette.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${isSelected ? "border-accent" : "border-line"}`}
                >
                  <Swatch palette={palette} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[14.5px] ${isSelected ? "font-medium" : ""}`}
                    >
                      {palette.name}
                    </span>
                    <span className="block text-[12px] text-ink-3">
                      {palette.description}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="text-accent">
                      <Check size={18} strokeWidth={2.25} aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full py-3 text-[14px] text-ink-3"
      >
        完成
      </button>
    </BottomSheet>
  );
}

export default PaletteSheet;
