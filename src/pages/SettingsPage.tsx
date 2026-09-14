import {
  ChevronRight,
  type LucideIcon,
  Monitor,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import { useState } from "react";
import Icon from "../components/Icon.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import SectionDivider from "../components/SectionDivider.tsx";
import {
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "../preferences.ts";
import {
  useCategories,
  useItems,
  useLocations,
  useSettings,
} from "../queries.ts";
import type { Category, Item, Location } from "../shared/types.ts";
import DefaultLeadSheet from "./DefaultLeadSheet.tsx";
import { PLACE_WORD, type PlaceKind } from "./placeForm.ts";
import PlaceSheet from "./PlaceSheet.tsx";

// 版面照 docs/prototype/p0.html 的 renderSettings()。
// 還沒做的：物品 icon 顯示開關（P2-12）；自選 icon、刪除、調整順序（P2-11）；資料（P2-13）。
// 還沒做的功能不顯示，跟 P1-15a 隱藏「調整順序」的做法一致（P1-19 確認）。

type Place = Location | Category;

// 說明文字只留目前成立的部分：原型寫「改名稱和 icon」，icon 要到 P2-11 才能改（P1-19 確認）
const SECTION_NOTE: Record<PlaceKind, string> = {
  location:
    "點一下可以改名稱。這個順序就是首頁的排列順序，有逾期的位置會暫時置頂。",
  category: "點一下可以改名稱。類別只負責分組與 icon，物品沿用類別的 icon。",
};

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "system", label: "跟隨系統", icon: Monitor },
  { value: "light", label: "淺色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
];

/** 原型的 themeSeg()：跟隨系統／淺色／深色。存在這支手機上（PRODUCT.md §4.6） */
function ThemeSegment() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  return (
    <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
      {THEME_OPTIONS.map((option) => {
        const selected = theme === option.value;
        const OptionIcon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              setTheme(option.value);
              saveThemePreference(option.value);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2 text-[13.5px] ${selected ? "bg-ink font-medium text-ground" : "text-ink-2"}`}
          >
            <OptionIcon size={15} strokeWidth={1.75} aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PlaceSection({
  kind,
  places,
  items,
  onAdd,
  onEdit,
}: {
  kind: PlaceKind;
  places: readonly Place[];
  items: readonly Item[];
  onAdd: () => void;
  onEdit: (place: Place) => void;
}) {
  const countOf = (place: Place) =>
    items.filter((item) =>
      kind === "location"
        ? item.locationId === place.id
        : item.categoryId === place.id,
    ).length;

  return (
    <section>
      <SectionDivider title={PLACE_WORD[kind]} />
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {places.map((place, index) => (
          <button
            key={place.id}
            type="button"
            onClick={() => onEdit(place)}
            className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${index === 0 ? "" : "border-t border-line-2"}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-line-2 text-ink-2">
              <Icon name={place.icon} size={19} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {place.name}
            </span>
            <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">
              {countOf(place)} 項
            </span>
            <span className="text-ink-3">
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={onAdd}
          // 原型一定有列表項目，新增鍵固定有上框線；沒有任何項目時不加，卡片頂端才不會多一條線
          className={`flex w-full items-center gap-2 px-3.5 py-3 text-[14px] text-accent ${places.length === 0 ? "" : "border-t border-line-2"}`}
        >
          <Plus size={17} strokeWidth={1.75} aria-hidden />
          新增{PLACE_WORD[kind]}
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
        {SECTION_NOTE[kind]}
      </p>
    </section>
  );
}

/** 載入中：外觀不需要等資料，其他段落用骨架灰塊佔位。原型沒有這個狀態 */
function SettingsSkeleton() {
  return (
    <>
      <div className="mt-6 h-[18px] w-16 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2.5 h-[56px] animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-6 h-[18px] w-16 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2.5 h-[160px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

/** 面板開著時是哪一個；null 表示沒開 */
type OpenSheet =
  | { type: "lead" }
  | { type: "place"; kind: PlaceKind; target: Place | null }
  | null;

function SettingsPage() {
  const settings = useSettings();
  const locations = useLocations();
  const categories = useCategories();
  const items = useItems();
  const queries = [settings, locations, categories, items];
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const failed = queries.find((query) => query.error !== null);
  const retry = () => {
    for (const query of queries) {
      void query.refetch();
    }
  };

  return (
    <>
      <PageHeader title="設定" />
      <main data-page="settings" className="flex-1 px-4 pb-44">
        {/* 外觀存在手機上，不用等資料，也不受讀取失敗影響 */}
        <SectionDivider title="外觀" />
        <ThemeSegment />

        {failed?.error ? (
          <LoadErrorState error={failed.error} onRetry={retry} />
        ) : !(
            settings.data &&
            locations.data &&
            categories.data &&
            items.data
          ) ? (
          <SettingsSkeleton />
        ) : (
          <>
            <SectionDivider title="提醒" />
            <button
              type="button"
              onClick={() => setSheet({ type: "lead" })}
              className="flex w-full items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 text-left shadow-card"
            >
              <span>
                <span className="block text-[14.5px]">新物品預設提前提醒</span>
                <span className="block text-[12px] text-ink-3">
                  只影響之後新增的物品
                </span>
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap font-mono text-[14px]">
                {settings.data.defaultLeadDays} 天
                <span className="text-ink-3">
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                </span>
              </span>
            </button>

            <PlaceSection
              kind="location"
              places={locations.data}
              items={items.data}
              onAdd={() =>
                setSheet({ type: "place", kind: "location", target: null })
              }
              onEdit={(place) =>
                setSheet({ type: "place", kind: "location", target: place })
              }
            />
            <PlaceSection
              kind="category"
              places={categories.data}
              items={items.data}
              onAdd={() =>
                setSheet({ type: "place", kind: "category", target: null })
              }
              onEdit={(place) =>
                setSheet({ type: "place", kind: "category", target: place })
              }
            />

            {sheet?.type === "lead" && (
              <DefaultLeadSheet
                current={settings.data.defaultLeadDays}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet?.type === "place" && (
              <PlaceSheet
                kind={sheet.kind}
                existing={
                  sheet.kind === "location" ? locations.data : categories.data
                }
                target={sheet.target}
                onClose={() => setSheet(null)}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default SettingsPage;
