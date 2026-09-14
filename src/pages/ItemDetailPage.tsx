import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Camera,
  ChevronRight,
  Pause,
  Pencil,
  Play,
  Trash,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import ItemNotFound from "../components/ItemNotFound.tsx";
import KeyValueRow from "../components/KeyValueRow.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import {
  DAYS_TEXT_COLOR,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "../components/statusStyles.ts";
import { useToast } from "../components/toastContext.ts";
import {
  invalidateItemData,
  usePurchases,
  useUpdateItemPause,
  useUpdateLogCycle,
} from "../queries.ts";
import { updateItemPause, updateLogCycle } from "../repo/index.ts";
import {
  brandModelText,
  displayName,
  isFilled,
  purchaseText,
} from "../shared/display.ts";
import type { Log, Purchase } from "../shared/types.ts";
import DeleteItemSheet from "./DeleteItemSheet.tsx";
import DoneSheet from "./DoneSheet.tsx";
import {
  buildItemDetailData,
  type HistoryRow,
  type IntervalFeedback,
} from "./itemDetailData.ts";
import type { ItemEntry } from "./itemEntries.ts";
import LogEditSheet from "./LogEditSheet.tsx";
import PauseSheet from "./PauseSheet.tsx";
import PhotoField from "./PhotoField.tsx";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderDetail()。
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
          {status === "paused" ? "—" : Math.abs(daysLeft)}
        </div>
        <div className="mt-1.5 whitespace-nowrap font-mono text-[12px] text-ink-3">
          {status === "paused"
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
          {/* 用推導出的狀態判斷：到了預計恢復日就不再顯示（due.ts 的 isPaused） */}
          {status === "paused" && (
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

/**
 * 實際間隔回饋卡片（PRODUCT.md §3.5），版面照原型。只提示，按了才改最近一筆的週期
 * （CLAUDE.md「下次到期用這次填的週期」：不自動學習實際間隔）
 */
function IntervalFeedbackCard({
  feedback,
  latestLog,
}: {
  feedback: IntervalFeedback;
  latestLog: Log;
}) {
  const update = useUpdateLogCycle();
  const queryClient = useQueryClient();
  const showToast = useToast();

  const onAdjust = () => {
    const previous = latestLog.cycleDays;
    update.mutate(
      { logId: latestLog.id, cycleDays: feedback.suggestedCycleDays },
      {
        onSuccess: () =>
          showToast({
            message: `目前週期改成 ${feedback.suggestedCycleDays} 天`,
            onUndo: () => {
              void updateLogCycle(latestLog.id, previous)
                .then(() => invalidateItemData(queryClient))
                .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
            },
          }),
        onError: (error) =>
          showToast({ message: `修改週期失敗：${error.message}` }),
      },
    );
  };

  return (
    <div className="mt-3 rounded-2xl bg-accent-soft px-4 py-3.5">
      <p className="text-[14px] leading-relaxed">
        目前週期 <b>{feedback.currentCycleDays} 天</b>，實際平均{" "}
        <b>{feedback.averageDays} 天</b>換一次。
      </p>
      <p className="mt-0.5 font-mono text-[12px] text-ink-2">
        近 {feedback.gaps.length} 次間隔：{feedback.gaps.join(" / ")} 天
      </p>
      <button
        type="button"
        onClick={onAdjust}
        disabled={update.isPending}
        className="mt-3 rounded-lg border border-accent bg-surface px-3 py-2 text-[13.5px] font-medium text-accent disabled:opacity-40"
      >
        {update.isPending
          ? "修改中…"
          : `把目前週期改成 ${feedback.suggestedCycleDays} 天`}
      </button>
      <p className="mt-2 text-[12px] text-ink-3">
        會同時更新這一次的到期日，過去的紀錄不變。
      </p>
    </div>
  );
}

/** 物品照片卡片，版面照原型詳情頁的「物品照片」 */
function ItemPhotosCard({ item }: { item: ItemEntry["item"] }) {
  return (
    <div className="mt-3 rounded-2xl bg-surface px-4 py-3.5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="whitespace-nowrap text-[13px] font-semibold text-ink-2">
          物品照片
        </h3>
        <span className="text-[11.5px] text-ink-3">
          機身、型號貼紙 · 最多 5 張
        </span>
      </div>
      <div className="mt-2.5">
        <PhotoField
          target={{ collection: "items", id: item.id }}
          photos={item.photos}
          max={5}
          variant="item"
        />
      </div>
    </div>
  );
}

function HistoryItem({
  row,
  purchase,
  onEdit,
}: {
  row: HistoryRow;
  /** 這筆指向的採購紀錄；這次沒買新的時是 null */
  purchase: Purchase | null;
  onEdit: (log: Log) => void;
}) {
  const { log, gapDays, isOldest, modelChanged, previousCycleDays } = row;
  const model = brandModelText(log);

  return (
    <li className="border-t border-line-2 first:border-t-0">
      <button
        type="button"
        onClick={() => onEdit(log)}
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
            {/* 型號變更與週期變更標示（PRODUCT.md §3.4）。原型的 rounded 在 Tailwind v4 是 rounded-sm */}
            {modelChanged && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-soon-soft px-1.5 py-0.5 text-[11px] text-soon">
                <ArrowLeftRight size={12} strokeWidth={2} aria-hidden />
                型號變更
              </span>
            )}
            {previousCycleDays !== null && (
              <span className="whitespace-nowrap rounded-sm bg-soon-soft px-1.5 py-0.5 text-[11px] text-soon">
                週期 {previousCycleDays} → {log.cycleDays}
              </span>
            )}
          </div>
          {/* 更換紀錄的備註：有填才顯示，照原樣換行（PRODUCT.md §4.3） */}
          {isFilled(log.note) && (
            <p className="mt-1 whitespace-pre-line break-words text-[12.5px] leading-relaxed text-ink-2">
              {log.note}
            </p>
          )}
          {(log.photos.length > 0 ||
            purchase !== null ||
            log.replacedOn === null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
              {log.photos.length > 0 && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Camera size={13} strokeWidth={1.75} aria-hidden />
                  耗材照片 {log.photos.length} 張
                </span>
              )}
              {/* 價格（PRODUCT.md §4.3），順序照原型：照片張數、價格、預計到期 */}
              {purchase !== null && (
                <span className="whitespace-nowrap font-mono">
                  {purchaseText(purchase)}
                </span>
              )}
              {log.replacedOn === null && (
                <span className="whitespace-nowrap">
                  新增時預計 {log.expectedDue} 到期
                </span>
              )}
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

function HistoryCard({
  history,
  purchaseOf,
  onEdit,
}: {
  history: HistoryRow[];
  purchaseOf: (log: Log) => Purchase | null;
  onEdit: (log: Log) => void;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-surface px-4 pb-1 pt-3.5 shadow-card">
      <h3 className="text-[13px] font-semibold text-ink-2">更換歷史</h3>
      <p className="mt-0.5 text-[12px] text-ink-3">
        點一筆可以編輯、補上品牌型號或刪除
      </p>
      <ol className="mt-1">
        {history.map((row) => (
          <HistoryItem
            key={row.log.id}
            row={row}
            purchase={purchaseOf(row.log)}
            onEdit={onEdit}
          />
        ))}
      </ol>
    </div>
  );
}

function ItemActions({
  itemId,
  paused,
  pauseBusy,
  onDone,
  onPause,
  onDelete,
}: {
  itemId: string;
  paused: boolean;
  /** 恢復送出中：避免連按 */
  pauseBusy: boolean;
  onDone: () => void;
  /** 暫停中時直接恢復，沒暫停時打開暫停面板（照原型） */
  onPause: () => void;
  onDelete: () => void;
}) {
  // 編輯頁沿用詳情頁收到的來源分頁，下方分頁的亮起位置才不會跑掉
  const location = useLocation();
  const secondary =
    "flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-3 text-[14px]";

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={onDone}
        className="col-span-3 rounded-xl bg-accent py-3.5 text-[15.5px] font-semibold text-accent-ink"
      >
        換好了
      </button>
      <button
        type="button"
        onClick={onPause}
        disabled={pauseBusy}
        className={`${secondary} disabled:opacity-40`}
      >
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
  const detail = useItemEntriesData((input) =>
    buildItemDetailData(input, itemId),
  );
  // 採購紀錄另外抓（P2-6）：只有詳情頁用得到，不放進首頁與物品頁共用的資料。
  // 要等它到齊才顯示：刪除物品或更換紀錄時要帶著採購紀錄，復原才能還原
  const purchases = usePurchases();
  const data = purchases.data === undefined ? null : detail.data;
  const error = detail.error ?? purchases.error;
  const retry = () => {
    detail.retry();
    void purchases.refetch();
  };
  const purchaseById = new Map(
    (purchases.data ?? []).map((purchase) => [purchase.id, purchase]),
  );
  const purchaseOf = (log: Log) =>
    log.purchaseId === null ? null : (purchaseById.get(log.purchaseId) ?? null);
  // 換好了面板是否開著。確認後留在詳情頁，更換歷史會直接多出一筆（P1-15 確認）
  const [doneOpen, setDoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const resume = useUpdateItemPause();
  const queryClient = useQueryClient();
  const showToast = useToast();
  // 正在編輯的那筆更換紀錄的 id；null 表示面板沒開。
  // 存 id 而不是整筆資料：面板裡加刪照片後資料會重抓，面板要拿到最新的照片清單
  const [editingLogId, setEditingLogId] = useState<Log["id"] | null>(null);

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
            {data.feedback !== null && (
              <IntervalFeedbackCard
                feedback={data.feedback}
                latestLog={data.entry.latestLog}
              />
            )}
            <ItemPhotosCard item={data.entry.item} />
            <HistoryCard
              history={data.history}
              purchaseOf={purchaseOf}
              onEdit={(log) => setEditingLogId(log.id)}
            />
            <ItemActions
              itemId={itemId}
              // 用推導出的狀態：日期已過、推導上已恢復的物品顯示「暫停」
              paused={data.entry.status === "paused"}
              pauseBusy={resume.isPending}
              onDone={() => setDoneOpen(true)}
              onPause={() => {
                const { entry } = data;
                if (entry.status !== "paused" || !entry.item.paused) {
                  setPauseOpen(true);
                  return;
                }
                // 恢復不跳面板，直接恢復並可復原（照原型）
                const previous = {
                  paused: true as const,
                  pausedUntil: entry.item.pausedUntil,
                };
                resume.mutate(
                  {
                    itemId: entry.item.id,
                    pause: { paused: false, pausedUntil: null },
                  },
                  {
                    onSuccess: () =>
                      showToast({
                        message: `${title} 已恢復`,
                        onUndo: () => {
                          void updateItemPause(entry.item.id, previous)
                            .then(() => invalidateItemData(queryClient))
                            .catch(() =>
                              showToast({ message: "復原失敗，請稍後再試" }),
                            );
                        },
                      }),
                    onError: (resumeError) =>
                      showToast({
                        message: `恢復失敗：${resumeError.message}`,
                      }),
                  },
                );
              }}
              onDelete={() => setDeleteOpen(true)}
            />
            {pauseOpen && (
              <PauseSheet
                entry={data.entry}
                onClose={() => setPauseOpen(false)}
              />
            )}
            {doneOpen && (
              <DoneSheet
                entry={data.entry}
                onClose={() => setDoneOpen(false)}
              />
            )}
            {(() => {
              const editingLog = data.history.find(
                (row) => row.log.id === editingLogId,
              )?.log;
              // 找不到時（例如剛被刪除）就不顯示面板
              return (
                editingLog !== undefined && (
                  <LogEditSheet
                    entry={data.entry}
                    logs={data.history.map((row) => row.log)}
                    log={editingLog}
                    purchase={purchaseOf(editingLog)}
                    onClose={() => setEditingLogId(null)}
                  />
                )
              );
            })()}
            {deleteOpen && (
              <DeleteItemSheet
                entry={data.entry}
                logs={data.history.map((row) => row.log)}
                purchases={data.history.flatMap((row) => {
                  const purchase = purchaseOf(row.log);
                  return purchase === null ? [] : [purchase];
                })}
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
