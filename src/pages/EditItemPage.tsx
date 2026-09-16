import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useParams } from "react-router";
import CyclePicker from "../components/CyclePicker.tsx";
import FieldError from "../components/FieldError.tsx";
import { INPUT_CLASS, LABEL_CLASS } from "../components/formStyles.ts";
import ItemNotFound from "../components/ItemNotFound.tsx";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import SectionDivider from "../components/SectionDivider.tsx";
import Select from "../components/Select.tsx";
import { useToast } from "../components/toastContext.ts";
import { useGoBack } from "../navigation.ts";
import { invalidateItemData, useUpdateItemWithLatestLog } from "../queries.ts";
import { updateItemWithLatestLog } from "../repo/index.ts";
import type { Category, Item, Location } from "../shared/types.ts";
import {
  buildEditItemSubmission,
  type EditItemFormErrors,
  type EditItemFormState,
  hasOtherDuplicate,
  initialEditItemForm,
} from "./editItemForm.ts";
import { buildItemDetailData } from "./itemDetailData.ts";
import type { ItemEntry } from "./itemEntries.ts";
import { previewName } from "./newItemForm.ts";
import PhotoField from "./PhotoField.tsx";
import { useItemEntriesData } from "./useItemEntriesData.ts";

// 版面照 docs/prototype/p0.html 的 renderEdit()。

function EditItemForm({
  entry,
  locations,
  categories,
  items,
}: {
  entry: ItemEntry;
  locations: readonly Location[];
  categories: readonly Category[];
  items: readonly Item[];
}) {
  const { item, latestLog } = entry;
  // 開啟時的值：存檔後的「復原」寫回這一份
  const [original] = useState(() => ({ item, latestLog }));
  const [form, setForm] = useState<EditItemFormState>(() =>
    initialEditItemForm(item, latestLog),
  );
  const [errors, setErrors] = useState<EditItemFormErrors>({});
  const update = useUpdateItemWithLatestLog();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const goBack = useGoBack();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // 送出後有錯誤時，捲到第一個錯誤訊息
  useEffect(() => {
    formRef.current
      ?.querySelector("[data-form-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [errors]);

  const set = <K extends keyof EditItemFormState>(
    key: K,
    value: EditItemFormState[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const duplicate = hasOtherDuplicate(form, items, item.id);
  const preview = previewName(form, locations, categories);
  const locationName =
    locations.find((location) => location.id === form.locationId)?.name ?? "";
  const categoryName =
    categories.find((category) => category.id === form.categoryId)?.name ?? "";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildEditItemSubmission(
      form,
      original.item,
      original.latestLog,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    update.mutate(
      { item: result.item, latestLog: result.latestLog },
      {
        onSuccess: () => {
          showToast({
            message: "已儲存",
            // 復原＝把物品與那筆更換紀錄改回開啟編輯頁時的值。
            // 這時已經離開編輯頁、這個元件已卸載，所以直接呼叫 repo 並自己讓資料重抓，不依賴這個元件的 hook
            onUndo: () => {
              void updateItemWithLatestLog(original.item, original.latestLog)
                .then(() => invalidateItemData(queryClient))
                .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
            },
          });
          // 回到詳情頁（照原型）。直接輸入網址進來時沒有上一頁，改去詳情頁
          goBack(`/items/${item.id}`);
        },
      },
    );
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor={`${id}-location`} className={LABEL_CLASS}>
            位置
          </label>
          <Select
            id={`${id}-location`}
            value={form.locationId}
            options={locations}
            onChange={(value) => set("locationId", value)}
          />
          <FieldError message={errors.location} />
        </div>
        <div>
          <label htmlFor={`${id}-category`} className={LABEL_CLASS}>
            類別
          </label>
          <Select
            id={`${id}-category`}
            value={form.categoryId}
            options={categories}
            onChange={(value) => set("categoryId", value)}
          />
          <FieldError message={errors.category} />
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">
        會顯示為 <span className="font-medium text-ink">{preview}</span>
      </p>

      <div className="mt-4">
        <label htmlFor={`${id}-label`} className={LABEL_CLASS}>
          補充名稱 <span className="font-normal text-ink-3">選填</span>
        </label>
        <input
          id={`${id}-label`}
          value={form.label}
          onChange={(event) => set("label", event.target.value)}
          placeholder="例如 水槽"
          className={INPUT_CLASS}
        />
        {duplicate && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-soon">
            {locationName}還有另一個{categoryName}，填個補充名稱才分得出來。
          </p>
        )}
      </div>

      <SectionDivider title="目前的耗材" />
      <p className="mb-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
        品牌、型號、週期會寫入<b>最近一次更換紀錄</b>（
        {latestLog.replacedOn ?? "日期未記錄"}
        ）。要改更早的紀錄，請到詳情頁的更換歷史點那一筆。
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor={`${id}-brand`} className={LABEL_CLASS}>
            品牌 <span className="font-normal text-ink-3">選填</span>
          </label>
          <input
            id={`${id}-brand`}
            value={form.brand}
            onChange={(event) => set("brand", event.target.value)}
            placeholder="例如 3M"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`${id}-model`} className={LABEL_CLASS}>
            型號 <span className="font-normal text-ink-3">選填</span>
          </label>
          <input
            id={`${id}-model`}
            value={form.model}
            onChange={(event) => set("model", event.target.value)}
            placeholder="例如 9808"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="mt-4">
        <p className={LABEL_CLASS}>
          週期 <span className="text-overdue">*</span>
        </p>
        <CyclePicker
          cycle={form.cycle}
          customCycle={form.customCycle}
          onChange={(next) => {
            setForm((previous) => ({ ...previous, ...next }));
            setErrors(({ cycle: _cycle, ...rest }) => rest);
          }}
        />
        <FieldError message={errors.cycle} />
      </div>

      <SectionDivider title="物品" />
      <div>
        <label htmlFor={`${id}-lead`} className={LABEL_CLASS}>
          提前提醒
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-lead`}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.leadDays}
            onChange={(event) => set("leadDays", event.target.value)}
            className={`${INPUT_CLASS} w-24`}
          />
          <span className="whitespace-nowrap text-[14px] text-ink-2">
            天前開始提醒
          </span>
        </div>
        <FieldError message={errors.leadDays} />
      </div>
      <div className="mt-4">
        <label htmlFor={`${id}-note`} className={LABEL_CLASS}>
          備註
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          value={form.note}
          onChange={(event) => set("note", event.target.value)}
          // 「購買通路」改記在每次的更換紀錄上，物品備註只放不太會變的資訊（2026-09-13 原型改版）
          placeholder="安裝位置、機身型號等注意事項…"
          className={`${INPUT_CLASS} leading-relaxed`}
        />
      </div>

      <div className="mt-4">
        <p className={LABEL_CLASS}>
          物品照片{" "}
          <span className="font-normal text-ink-3">
            機身、型號貼紙、濾網裝在哪，之後買耗材時用得到
          </span>
        </p>
        {/* 照片立刻上傳與刪除，不等按儲存（見 PhotoField） */}
        <PhotoField
          target={{ collection: "items", id: item.id }}
          photos={item.photos}
          max={5}
          variant="item"
        />
      </div>

      {update.error !== null && !update.isPending && (
        <p className="mt-6 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          儲存失敗：{update.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={update.isPending}
        className="mt-6 w-full rounded-xl bg-accent py-4 text-[16px] font-semibold text-accent-ink disabled:opacity-40"
      >
        {update.isPending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}

/** 載入中：用骨架灰塊佔位。原型沒有這個狀態 */
function FormSkeleton() {
  return (
    <>
      <div className="mt-4 h-[76px] animate-pulse rounded-xl bg-line-2" />
      <div className="mt-4 h-[76px] animate-pulse rounded-xl bg-line-2" />
      <div className="mt-6 h-[200px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

function EditItemPage() {
  const { itemId = "" } = useParams();
  const { data, error, retry } = useItemEntriesData((input) => ({
    detail: buildItemDetailData(input, itemId),
    locations: input.locations,
    categories: input.categories,
    items: input.items,
  }));

  return (
    <>
      {/* 原型的編輯頁返回詳情頁 */}
      <PageHeader title="編輯物品" backTo={`/items/${itemId}`} />
      {/* data-item-id 只給路由測試確認網址參數有傳進頁面，畫面上看不到 */}
      <main
        data-page="edit-item"
        data-item-id={itemId}
        className="flex-1 px-4 pb-44"
      >
        {error !== null ? (
          <LoadErrorState error={error} onRetry={retry} />
        ) : data === null ? (
          <FormSkeleton />
        ) : !data.detail.found ? (
          <ItemNotFound />
        ) : (
          <EditItemForm
            entry={data.detail.entry}
            locations={data.locations}
            categories={data.categories}
            items={data.items}
          />
        )}
      </main>
    </>
  );
}

export default EditItemPage;
