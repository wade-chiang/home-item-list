import { Link } from "react-router";
import EmptyItemsState from "../components/EmptyItemsState.tsx";
import Icon from "../components/Icon.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { DAYS_TEXT_COLOR, STRIPE_COLOR } from "../components/statusStyles.ts";
import type { NavState } from "../navigation.ts";
import { brandModelLine, daysText, isFilled } from "../shared/display.ts";
import { buildHomeData, type HomeData, type HomeGroup } from "./homeData.ts";
import type { ItemEntry } from "./itemEntries.ts";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderHome()。
// 快速篩選（點數量方塊）是 P2-10，所以數量方塊這一步不是按鈕；「N 項已暫停」是 P2-2。

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

function StatTiles({ counts }: { counts: HomeData["counts"] }) {
  return (
    <div className="grid grid-cols-3 gap-2 pt-4">
      {TILES.map((tile) => (
        <div
          key={tile.status}
          className={`rounded-xl px-3 py-2.5 text-left ${tile.className}`}
        >
          <div className="font-mono text-[22px] font-medium leading-none tabular-nums">
            {counts[tile.status]}
          </div>
          <div className="mt-1.5 whitespace-nowrap text-[12px]">
            {tile.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ entry, isFirst }: { entry: ItemEntry; isFirst: boolean }) {
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-line-2 text-ink-2">
        <Icon name={category.icon} size={19} />
      </span>
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
      {/* P1-15 接上「換好了」面板前先停用 */}
      <button
        type="button"
        disabled
        className={`shrink-0 self-center whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium ${urgent ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}
      >
        換好了
      </button>
    </div>
  );
}

function GroupSection({ group }: { group: HomeGroup }) {
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
          <ItemRow key={entry.item.id} entry={entry} isFirst={index === 0} />
        ))}
      </div>
    </section>
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
  const { data: home, error, retry } = useItemEntriesData(buildHomeData);

  return (
    <>
      <PageHeader title="換了沒" />
      <main data-page="home" className="flex-1 px-4 pb-44">
        {error !== null ? (
          <LoadErrorState error={error} onRetry={retry} />
        ) : home === null ? (
          <HomeSkeleton />
        ) : home.activeCount === 0 ? (
          <EmptyItemsState />
        ) : (
          <>
            <StatTiles counts={home.counts} />
            {home.groups.map((group) => (
              <GroupSection key={group.location.id} group={group} />
            ))}
          </>
        )}
      </main>
    </>
  );
}

export default HomePage;
