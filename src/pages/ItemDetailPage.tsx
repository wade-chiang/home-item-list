import { ChevronRight, Pause, Pencil, Play, Trash } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import ItemNotFound from "../components/ItemNotFound.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import {
  DAYS_TEXT_COLOR,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "../components/statusStyles.ts";
import { brandModelText, displayName, isFilled } from "../shared/display.ts";
import DeleteItemSheet from "./DeleteItemSheet.tsx";
import DoneSheet from "./DoneSheet.tsx";
import { buildItemDetailData, type HistoryRow } from "./itemDetailData.ts";
import type { ItemEntry } from "./itemEntries.ts";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderDetail()。
// 這一步不做（P1-13 確認）：實際間隔回饋與型號／週期變更標示（P2-9）、物品照片與耗材照片張數（P2-3）、價格（P2-8）。
// 還不能用的操作照原型顯示但停用，各 task 做到時再接上。

function SummaryCard({ entry }: { entry: ItemEntry }) {
  const { item, latestLog, due, daysLeft, status } = entry;

  return (
    <div className="mt-4 flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <div className="min-w-[76px]">
        <div
          className="font-mono text-[34px] font-medium leading-none tabular-nums"
          style={{
            color: status === "ok" ? "var(--ink)" : DAYS_TEXT_COLOR[status],
          }}
        >
          {item.paused ? "—" : Math.abs(daysLeft)}
        </div>
        <div className="mt-1.5 whitespace-nowrap font-mono text-[12px] text-ink-3">
          {item.paused
            ? "已暫停"
            : daysLeft < 0
              ? "天前該換"
              : daysLeft === 0
                ? "今天到期"
                : "天後到期"}
        </div>
      </div>
      <div className="flex-1 text-right">
        <span
          className={`whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11.5px] ${STATUS_BADGE_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
        <div className="mt-2 font-mono text-[12.5px] leading-relaxed text-ink-3">
          {due} 到期
          <br />
          {latestLog.replacedOn !== null
            ? `上次更換 ${latestLog.replacedOn}`
            : "上次更換日期未記錄"}
          {item.paused && (
            <>
              <br />
              預計 {item.pausedUntil} 恢復
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 原型的 kv()：左邊標題、右邊值，可加一行小字說明 */
function KeyValueRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-t border-line-2 py-2.5 first:border-t-0">
      <span className="shrink-0 whitespace-nowrap text-[13.5px] text-ink-3">
        {label}
      </span>
      <span className="text-right text-[14px]">
        {value}
        {hint !== undefined && (
          <span className="block font-mono text-[11.5px] text-ink-3">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

function InfoCard({ entry }: { entry: ItemEntry }) {
  const { item, location, category, latestLog } = entry;
  const model = brandModelText(latestLog);

  return (
    <div className="mt-3 rounded-2xl bg-surface px-4 py-1 shadow-card">
      {/* 目前型號沒填時整列隱藏（PRODUCT.md §4.3） */}
      {model !== null && (
        <KeyValueRow label="目前型號" value={model} hint="取自最近一次更換" />
      )}
      <KeyValueRow
        label="目前週期"
        value={`${latestLog.cycleDays} 天`}
        hint="取自最近一次更換"
      />
      <KeyValueRow label="提前提醒" value={`${item.leadDays} 天`} />
      <KeyValueRow label="位置" value={location.name} />
      <KeyValueRow label="類別" value={category.name} />
      {isFilled(item.label) && (
        <KeyValueRow label="補充名稱" value={item.label} />
      )}
      {isFilled(item.note) && <KeyValueRow label="備註" value={item.note} />}
    </div>
  );
}

function HistoryItem({ row }: { row: HistoryRow }) {
  const { log, gapDays, isOldest } = row;
  const model = brandModelText(log);

  return (
    <li className="border-t border-line-2 first:border-t-0">
      {/* P1-18 接上編輯面板前先停用 */}
      <button
        type="button"
        disabled
        className="flex w-full items-start gap-2 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="whitespace-nowrap font-mono text-[13.5px] tabular-nums">
              {log.replacedOn ?? "日期未記錄"}
            </span>
            <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">
              {gapDays !== null ? `隔 ${gapDays} 天` : isOldest ? "第一筆" : ""}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
            {model !== null ? (
              <>
                <span>{model}</span>
                <span className="whitespace-nowrap text-ink-3">
                  · {log.cycleDays} 天
                </span>
              </>
            ) : (
              <span className="whitespace-nowrap text-ink-3">
                {log.cycleDays} 天
              </span>
            )}
          </div>
          {log.replacedOn === null && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
              <span className="whitespace-nowrap">
                新增時預計 {log.expectedDue} 到期
              </span>
            </div>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-ink-3">
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </span>
      </button>
    </li>
  );
}

function HistoryCard({ history }: { history: HistoryRow[] }) {
  return (
    <div className="mt-3 rounded-2xl bg-surface px-4 pb-1 pt-3.5 shadow-card">
      <h3 className="text-[13px] font-semibold text-ink-2">更換歷史</h3>
      <p className="mt-0.5 text-[12px] text-ink-3">
        點一筆可以編輯、補上品牌型號或刪除
      </p>
      <ol className="mt-1">
        {history.map((row) => (
          <HistoryItem key={row.log.id} row={row} />
        ))}
      </ol>
    </div>
  );
}

function ItemActions({
  itemId,
  paused,
  onDone,
  onDelete,
}: {
  itemId: string;
  paused: boolean;
  onDone: () => void;
  onDelete: () => void;
}) {
  // 編輯頁沿用詳情頁收到的來源分頁，下方分頁的亮起位置才不會跑掉
  const location = useLocation();
  const secondary =
    "flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-3 text-[14px]";

  return (
    // 還沒接上的按鈕先停用：暫停／恢復是 P2-1
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={onDone}
        className="col-span-3 rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink"
      >
        換好了
      </button>
      <button type="button" disabled className={secondary}>
        {paused ? (
          <Play size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <Pause size={16} strokeWidth={1.75} aria-hidden />
        )}
        {paused ? "恢復" : "暫停"}
      </button>
      <Link
        to={`/items/${itemId}/edit`}
        state={location.state}
        className={secondary}
      >
        <Pencil size={16} strokeWidth={1.75} aria-hidden />
        編輯
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className={`${secondary} text-overdue`}
      >
        <Trash size={16} strokeWidth={1.75} aria-hidden />
        刪除
      </button>
    </div>
  );
}

/** 載入中：用骨架灰塊佔位。原型沒有這個狀態 */
function DetailSkeleton() {
  return (
    <>
      <div className="mt-4 h-[104px] animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-3 h-[220px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

function ItemDetailPage() {
  const { itemId = "" } = useParams();
  const { data, error, retry } = useItemEntriesData((input) =>
    buildItemDetailData(input, itemId),
  );
  // 換好了面板是否開著。確認後留在詳情頁，更換歷史會直接多出一筆（P1-15 確認）
  const [doneOpen, setDoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 標題是物品的顯示名稱（照原型）；資料還沒到時先顯示「物品詳情」
  const title = data?.found
    ? displayName(
        data.entry.location.name,
        data.entry.category.name,
        data.entry.item.label,
      )
    : "物品詳情";

  return (
    <>
      <PageHeader title={title} backTo="/" />
      {/* data-item-id 只給路由測試確認網址參數有傳進頁面，畫面上看不到 */}
      <main
        data-page="item-detail"
        data-item-id={itemId}
        className="flex-1 px-4 pb-44"
      >
        {error !== null ? (
          <LoadErrorState error={error} onRetry={retry} />
        ) : data === null ? (
          <DetailSkeleton />
        ) : !data.found ? (
          <ItemNotFound />
        ) : (
          <>
            <SummaryCard entry={data.entry} />
            <InfoCard entry={data.entry} />
            <HistoryCard history={data.history} />
            <ItemActions
              itemId={itemId}
              paused={data.entry.item.paused}
              onDone={() => setDoneOpen(true)}
              onDelete={() => setDeleteOpen(true)}
            />
            {doneOpen && (
              <DoneSheet
                entry={data.entry}
                onClose={() => setDoneOpen(false)}
              />
            )}
            {deleteOpen && (
              <DeleteItemSheet
                entry={data.entry}
                logs={data.history.map((row) => row.log)}
                onClose={() => setDeleteOpen(false)}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default ItemDetailPage;
