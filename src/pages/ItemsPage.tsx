import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import EmptyItemsState from "../components/EmptyItemsState.tsx";
import Icon from "../components/Icon.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { DAYS_TEXT_COLOR, STRIPE_COLOR } from "../components/statusStyles.ts";
import type { NavState } from "../navigation.ts";
import { readItemIconsPreference } from "../preferences.ts";
import { brandModelLine, isFilled, shortDaysText } from "../shared/display.ts";
import type { ItemEntry } from "./itemEntries.ts";
import { buildItemsData, type ItemsGroup } from "./itemsData.ts";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderItems() 與 itemRow()。
// 物品頁用來找東西，不放「換好了」按鈕（PRODUCT.md §4.2）。

const FROM_ITEMS: NavState = { from: "items" };

function ItemRow({
  entry,
  isFirst,
  showIcon,
}: {
  entry: ItemEntry;
  isFirst: boolean;
  /** 設定頁的「物品 icon」開關（P2-12）：位置名稱前的小 icon，照原型 */
  showIcon: boolean;
}) {
  const { item, location, latestLog, daysLeft, status } = entry;

  return (
    <Link
      to={`/items/${item.id}`}
      state={FROM_ITEMS}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left ${isFirst ? "" : "border-t border-line-2"}`}
    >
      <span
        className="w-[3px] self-stretch rounded-full"
        style={{ background: STRIPE_COLOR[status] }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15px] font-medium">
          {showIcon && (
            <span className="text-ink-3">
              <Icon name={location.icon} size={15} />
            </span>
          )}
          <span className="whitespace-nowrap">{location.name}</span>
          {isFilled(item.label) && (
            <span className="truncate font-normal text-ink-3">
              · {item.label}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
          {brandModelLine(latestLog)}
        </span>
      </span>
      <span
        className="shrink-0 whitespace-nowrap font-mono text-[13.5px] tabular-nums"
        style={{ color: DAYS_TEXT_COLOR[status] }}
      >
        {shortDaysText(status, daysLeft)}
      </span>
      <span className="shrink-0 text-ink-3">
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </Link>
  );
}

function GroupSection({
  group,
  showIcons,
}: {
  group: ItemsGroup;
  showIcons: boolean;
}) {
  return (
    <section>
      <div className="mb-2 mt-6 flex items-center gap-2.5">
        <span className="text-ink">
          <Icon name={group.category.icon} size={20} />
        </span>
        <h2 className="whitespace-nowrap text-[17px] font-semibold">
          {group.category.name}
        </h2>
        <span className="font-mono text-[12px] text-ink-3">
          {group.items.length}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {group.items.map((entry, index) => (
          <ItemRow
            key={entry.item.id}
            entry={entry}
            isFirst={index === 0}
            showIcon={showIcons}
          />
        ))}
      </div>
    </section>
  );
}

/** 載入中：用骨架灰塊佔位，避免資料回來時畫面跳動。原型沒有這個狀態 */
function ItemsSkeleton() {
  return (
    <>
      <div className="mt-4 h-[18px] w-40 animate-pulse rounded-md bg-line-2" />
      <div className="mt-6 h-[26px] w-28 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2 h-[140px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

function ItemsPage() {
  const { data, error, retry } = useItemEntriesData(buildItemsData);
  // 物品 icon 顯示偏好（P2-12），打開物品頁時讀一次
  const [showIcons] = useState(readItemIconsPreference);

  return (
    <>
      <PageHeader title="物品" />
      <main data-page="items" className="flex-1 px-4 pb-44">
        {error !== null ? (
          <LoadErrorState error={error} onRetry={retry} />
        ) : data === null ? (
          <ItemsSkeleton />
        ) : data.totalCount === 0 ? (
          <EmptyItemsState />
        ) : (
          <>
            <div className="flex items-baseline justify-between pt-4">
              <span className="text-[13px] text-ink-3">
                {data.totalCount} 項 · {data.pausedCount} 項暫停
              </span>
              <span className="text-[12px] text-ink-3">依類別分組</span>
            </div>
            {data.groups.map((group) => (
              <GroupSection
                key={group.category.id}
                group={group}
                showIcons={showIcons}
              />
            ))}
          </>
        )}
      </main>
    </>
  );
}

export default ItemsPage;
