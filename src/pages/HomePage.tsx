import { ChevronRight, Pause } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import EmptyItemsState from "../components/EmptyItemsState.tsx";
import Icon from "../components/Icon.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { DAYS_TEXT_COLOR, STRIPE_COLOR } from "../components/statusStyles.ts";
import type { NavState } from "../navigation.ts";
import { readItemIconsPreference } from "../preferences.ts";
import { brandModelLine, daysText, isFilled } from "../shared/display.ts";
import DoneSheet from "./DoneSheet.tsx";
import {
  buildHomeData,
  type HomeData,
  type HomeFilter,
  type HomeGroup,
} from "./homeData.ts";
import type { ItemEntry } from "./itemEntries.ts";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderHome()。

const FROM_HOME: NavState = { from: "home" };

const TILES = [
  {
    status: "overdue",
    label: "逾期",
    className: "bg-overdue-soft text-overdue",
  },
  { status: "soon", label: "即將到期", className: "bg-soon-soft text-soon" },
  { status: "ok", label: "正常", className: "bg-line-2 text-ink-2" },
] as const;

/**
 * 數量方塊，點一下快速篩選、再點一下取消（P2-10，PRODUCT.md §4.1，照原型的 statTile()）。
 * 一次選一個；被選的加框線、其他變淡；數量為 0 的方塊不能點
 */
function StatTiles({
  counts,
  filter,
  onFilter,
}: {
  counts: HomeData["counts"];
  filter: HomeFilter | null;
  onFilter: (filter: HomeFilter | null) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 pt-4">
      {TILES.map((tile) => {
        const active = filter === tile.status;
        const dim = filter !== null && !active;
        return (
          <button
            key={tile.status}
            type="button"
            disabled={counts[tile.status] === 0}
            aria-pressed={active}
            onClick={() => onFilter(active ? null : tile.status)}
            className={`rounded-xl px-3 py-2.5 text-left transition-opacity ${tile.className} ${active ? "ring-2 ring-inset ring-current" : ""} ${dim ? "opacity-40" : ""} disabled:cursor-default`}
          >
            <div className="font-mono text-[22px] font-medium leading-none tabular-nums">
              {counts[tile.status]}
            </div>
            <div className="mt-1.5 whitespace-nowrap text-[12px]">
              {tile.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ItemRow({
  entry,
  isFirst,
  showIcon,
  onDone,
}: {
  entry: ItemEntry;
  isFirst: boolean;
  /** 設定頁的「物品 icon」開關（P2-12） */
  showIcon: boolean;
  onDone: (entry: ItemEntry) => void;
}) {
  const { item, category, latestLog, daysLeft, status } = entry;
  const urgent = status === "overdue" || status === "soon";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 ${isFirst ? "" : "border-t border-line-2"}`}
    >
      <span
        className="w-[3px] self-stretch rounded-full"
        style={{ background: STRIPE_COLOR[status] }}
      />
      {showIcon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-line-2 text-ink-2">
          <Icon name={category.icon} size={19} />
        </span>
      )}
      <Link
        to={`/items/${item.id}`}
        state={FROM_HOME}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block text-[15.5px] font-medium leading-snug">
          {category.name}
          {isFilled(item.label) && (
            <span className="font-normal text-ink-3"> · {item.label}</span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
          {brandModelLine(latestLog)}
        </span>
        <span
          className="mt-1 block whitespace-nowrap font-mono text-[14.5px] font-medium tabular-nums"
          style={{ color: DAYS_TEXT_COLOR[status] }}
        >
          {daysText(status, daysLeft, item.pausedUntil)}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => onDone(entry)}
        className={`shrink-0 self-center whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium ${urgent ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}
      >
        換好了
      </button>
    </div>
  );
}

function GroupSection({
  group,
  showIcons,
  onDone,
}: {
  group: HomeGroup;
  showIcons: boolean;
  onDone: (entry: ItemEntry) => void;
}) {
  return (
    <section>
      <div className="mb-2.5 mt-7 flex items-center gap-2.5">
        <span className="text-ink">
          <Icon name={group.location.icon} size={23} />
        </span>
        <h2 className="whitespace-nowrap text-[20px] font-semibold tracking-wide">
          {group.location.name}
        </h2>
        <span className="font-mono text-[12.5px] text-ink-3">
          {group.items.length}
        </span>
        {group.hasOverdue && (
          <span className="whitespace-nowrap rounded-md bg-overdue-soft px-1.5 py-0.5 text-[11px] font-medium text-overdue">
            有逾期
          </span>
        )}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {group.items.map((entry, index) => (
          <ItemRow
            key={entry.item.id}
            entry={entry}
            isFirst={index === 0}
            showIcon={showIcons}
            onDone={onDone}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * 首頁最下方常駐的「N 項已暫停」（P2-2），照原型。點了到物品頁，暫停中的物品排在各類別最後。
 * 常駐、不可收合：暫停會靜默失效，要讓它不會從視野裡消失（CLAUDE.md「暫停會靜默失效」）。
 * 0 項時也顯示，只是不列位置。
 */
function PausedSummary({ paused }: { paused: HomeData["paused"] }) {
  return (
    <Link
      to="/items"
      className="mt-7 flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left"
    >
      <span className="text-paused">
        <Pause size={17} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-[14px] text-ink-2">
        {paused.count} 項已暫停
        {paused.locationNames.length > 0 && (
          <span className="text-ink-3">
            {" "}
            · {paused.locationNames.join("、")}
          </span>
        )}
      </span>
      <span className="text-ink-3">
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </Link>
  );
}

/** 載入中：用骨架灰塊佔位，避免資料回來時畫面跳動。原型沒有這個狀態 */
function HomeSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 pt-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-[70px] animate-pulse rounded-xl bg-line-2"
          />
        ))}
      </div>
      <div className="mt-7 h-[28px] w-32 animate-pulse rounded-md bg-line-2" />
      <div className="mt-2.5 h-[200px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

function HomePage() {
  // 篩選只存在這個畫面的 state：離開首頁（換分頁、進詳情頁）時畫面卸載就清除，
  // 不存 localStorage、不放網址（CLAUDE.md「首頁篩選不要記住」）
  const [filter, setFilter] = useState<HomeFilter | null>(null);
  // 物品 icon 顯示偏好存在這支手機上（P2-12）。首頁跟設定頁不會同時出現，打開首頁時讀一次即可
  const [showIcons] = useState(readItemIconsPreference);
  const {
    data: home,
    error,
    retry,
  } = useItemEntriesData((input) => buildHomeData(input, filter));
  // 篩選中的狀態數量歸零時自動取消：buildHomeData 已改用 null 顯示，這裡把 state 也清掉，
  // 之後同一個狀態又有物品時才不會自己跳回篩選。render 中依資料調整 state 是 React 允許的寫法
  if (home !== null && filter !== null && home.filter === null) {
    setFilter(null);
  }
  // 換好了面板開著時是哪個物品；null 表示沒開
  const [doneEntry, setDoneEntry] = useState<ItemEntry | null>(null);

  return (
    <>
      <PageHeader title="換了沒" />
      <main data-page="home" className="flex-1 px-4 pb-44">
        {error !== null ? (
          <LoadErrorState error={error} onRetry={retry} />
        ) : home === null ? (
          <HomeSkeleton />
        ) : home.totalCount === 0 ? (
          <EmptyItemsState />
        ) : (
          <>
            <StatTiles
              counts={home.counts}
              filter={home.filter}
              onFilter={setFilter}
            />
            {home.groups.map((group) => (
              <GroupSection
                key={group.location.id}
                group={group}
                showIcons={showIcons}
                onDone={setDoneEntry}
              />
            ))}
            <PausedSummary paused={home.paused} />
          </>
        )}
      </main>
      {doneEntry !== null && (
        <DoneSheet entry={doneEntry} onClose={() => setDoneEntry(null)} />
      )}
    </>
  );
}

export default HomePage;
