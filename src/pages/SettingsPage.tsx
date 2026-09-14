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
  readItemIconsPreference,
  readThemePreference,
  saveItemIconsPreference,
  saveThemePreference,
  type ThemePreference,
} from "../preferences.ts";
import {
  useCategories,
  useItems,
  useLocations,
  useLogs,
  useSettings,
} from "../queries.ts";
import type { Category, Item, Location } from "../shared/types.ts";
import DefaultLeadSheet from "./DefaultLeadSheet.tsx";
import ExportBackupSheet from "./ExportBackupSheet.tsx";
import LocationReorderList from "./LocationReorderList.tsx";
import { PLACE_WORD, type PlaceKind } from "./placeForm.ts";
import PlaceSheet from "./PlaceSheet.tsx";
import RestoreBackupSheet from "./RestoreBackupSheet.tsx";

// 版面照 docs/prototype/p0.html 的 renderSettings()。

type Place = Location | Category;

// 說明文字照原型。icon 自選在 P2-11 做好，所以加回「和 icon」
const SECTION_NOTE: Record<PlaceKind, string> = {
  location:
    "點一下可以改名稱和 icon。這個順序就是首頁的排列順序，有逾期的位置會暫時置頂。",
  category:
    "點一下可以改名稱和 icon。類別只負責分組與 icon，物品沿用類別的 icon。",
};

// 原型寫「用箭頭調整順序。正式版可以直接拖曳把手…」；實作改成拖曳（P2-11 確認）
const REORDER_NOTE = "按住左邊的把手拖曳，調整順序。";

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

/** 屬於這個位置或類別的物品數 */
function countItems(kind: PlaceKind, place: Place, items: readonly Item[]) {
  return items.filter((item) =>
    kind === "location"
      ? item.locationId === place.id
      : item.categoryId === place.id,
  ).length;
}

/**
 * 「物品 icon」開關（P2-12），照原型的 switchRow()。存在這支手機上（PRODUCT.md §4.6）。
 * 原型的說明寫「在首頁列表」，但實際上首頁與物品頁的列表都受影響，文字照實際行為改（P2-12 確認）
 */
function ItemIconsSwitch() {
  const [show, setShow] = useState(readItemIconsPreference);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={show}
      onClick={() => {
        setShow(!show);
        saveItemIconsPreference(!show);
      }}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px]">物品 icon</span>
        <span className="block text-[12px] text-ink-3">
          在首頁與物品頁的列表顯示 icon
        </span>
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full ${show ? "bg-accent" : "bg-line"}`}
      >
        {/* 原型的 shadow 在 Tailwind v4 是 shadow-sm */}
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all ${show ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
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
  // 排序模式只有位置有（照原型與 PRODUCT.md §4.6）；只有一個位置時沒東西可排，不顯示按鈕
  const [reordering, setReordering] = useState(false);
  const canReorder = kind === "location" && places.length > 1;

  return (
    <section>
      {kind === "location" ? (
        <div className="mb-2.5 mt-6 flex items-center gap-2.5">
          <h2 className="whitespace-nowrap text-[13px] font-semibold tracking-wide text-ink-2">
            {PLACE_WORD[kind]}
          </h2>
          <span className="h-px flex-1 bg-line" />
          {(canReorder || reordering) && (
            <button
              type="button"
              onClick={() => setReordering(!reordering)}
              className="whitespace-nowrap text-[13px] font-medium text-accent"
            >
              {reordering ? "完成" : "調整順序"}
            </button>
          )}
        </div>
      ) : (
        <SectionDivider title={PLACE_WORD[kind]} />
      )}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {reordering ? (
          <LocationReorderList locations={places as readonly Location[]} />
        ) : (
          <>
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
                  {countItems(kind, place, items)} 項
                </span>
                <span className="text-ink-3">
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                </span>
              </button>
            ))}
            {/* 排序模式時隱藏新增鍵（照原型） */}
            <button
              type="button"
              onClick={onAdd}
              // 原型一定有列表項目，新增鍵固定有上框線；沒有任何項目時不加，卡片頂端才不會多一條線
              className={`flex w-full items-center gap-2 px-3.5 py-3 text-[14px] text-accent ${places.length === 0 ? "" : "border-t border-line-2"}`}
            >
              <Plus size={17} strokeWidth={1.75} aria-hidden />
              新增{PLACE_WORD[kind]}
            </button>
          </>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
        {reordering ? REORDER_NOTE : SECTION_NOTE[kind]}
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
  | { type: "export" }
  | { type: "restore" }
  | null;

function SettingsPage() {
  const settings = useSettings();
  const locations = useLocations();
  const categories = useCategories();
  const items = useItems();
  // 匯出面板顯示更換紀錄與照片的數量（P2-13）
  const logs = useLogs();
  const queries = [settings, locations, categories, items, logs];
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
        <div className="mt-2">
          <ItemIconsSwitch />
        </div>

        {failed?.error ? (
          <LoadErrorState error={failed.error} onRetry={retry} />
        ) : !(
            settings.data &&
            locations.data &&
            categories.data &&
            items.data &&
            logs.data
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

            {/* 資料（P2-13），照原型的「資料」段 */}
            <SectionDivider title="資料" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSheet({ type: "export" })}
                className="rounded-xl border border-line bg-surface py-3 text-[14px]"
              >
                匯出備份
              </button>
              <button
                type="button"
                onClick={() => setSheet({ type: "restore" })}
                className="rounded-xl border border-line bg-surface py-3 text-[14px]"
              >
                還原
              </button>
            </div>

            {sheet?.type === "export" && (
              <ExportBackupSheet
                data={{
                  items: items.data,
                  logs: logs.data,
                  locations: locations.data,
                  categories: categories.data,
                }}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet?.type === "restore" && (
              <RestoreBackupSheet
                currentItemCount={items.data.length}
                onClose={() => setSheet(null)}
              />
            )}

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
                itemCount={
                  sheet.target === null
                    ? 0
                    : countItems(sheet.kind, sheet.target, items.data)
                }
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
