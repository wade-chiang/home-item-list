import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import Icon from "../components/Icon.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import SectionDivider from "../components/SectionDivider.tsx";
import { useCategories, useItems, useLocations } from "../queries.ts";
import type { Category, Item, Location } from "../shared/types.ts";
import NewPlaceSheet from "./NewPlaceSheet.tsx";
import { PLACE_WORD, type PlaceKind } from "./placeForm.ts";

// 版面照 docs/prototype/p0.html 的 renderSettings()，P1-15a 先做「位置」「類別」兩段的列表與新增。
// 還沒做的：外觀、新物品預設提前提醒、改名（P1-19）；自選 icon、刪除、調整順序（P2-11）；資料（P2-13）。
// 列表每一列照原型顯示但停用，跟詳情頁的做法一致（P1-15a 確認）。

// 說明文字只留目前成立的部分。「點一下可以改名稱和 icon。」等 P1-19、P2-11 做好再加回句首（P1-15a 確認）
const SECTION_NOTE: Record<PlaceKind, string> = {
  location: "這個順序就是首頁的排列順序，有逾期的位置會暫時置頂。",
  category: "類別只負責分組與 icon，物品沿用類別的 icon。",
};

function PlaceSection({
  kind,
  places,
  items,
  onAdd,
}: {
  kind: PlaceKind;
  places: readonly (Location | Category)[];
  items: readonly Item[];
  onAdd: () => void;
}) {
  const countOf = (place: Location | Category) =>
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
          // P1-19 接上改名前先停用
          <button
            key={place.id}
            type="button"
            disabled
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

/** 載入中：用骨架灰塊佔位。原型沒有這個狀態 */
function SettingsSkeleton() {
  return (
    <>
      <div className="mt-6 h-[18px] w-16 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2.5 h-[160px] animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-6 h-[18px] w-16 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2.5 h-[160px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

function SettingsPage() {
  const locations = useLocations();
  const categories = useCategories();
  const items = useItems();
  const queries = [locations, categories, items];
  // 新增面板開著時是哪一種；null 表示沒開
  const [adding, setAdding] = useState<PlaceKind | null>(null);

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
        {failed?.error ? (
          <LoadErrorState error={failed.error} onRetry={retry} />
        ) : !(locations.data && categories.data && items.data) ? (
          <SettingsSkeleton />
        ) : (
          <>
            <PlaceSection
              kind="location"
              places={locations.data}
              items={items.data}
              onAdd={() => setAdding("location")}
            />
            <PlaceSection
              kind="category"
              places={categories.data}
              items={items.data}
              onAdd={() => setAdding("category")}
            />
            {adding !== null && (
              <NewPlaceSheet
                kind={adding}
                existing={
                  adding === "location" ? locations.data : categories.data
                }
                onClose={() => setAdding(null)}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default SettingsPage;
