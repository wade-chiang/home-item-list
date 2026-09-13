import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import CyclePicker from "../components/CyclePicker.tsx";
import FieldError from "../components/FieldError.tsx";
import {
  chipClass,
  INPUT_CLASS,
  LABEL_CLASS,
} from "../components/formStyles.ts";
import LoadErrorState from "../components/LoadErrorState.tsx";
import PageHeader from "../components/PageHeader.tsx";
import SectionDivider from "../components/SectionDivider.tsx";
import { useToast } from "../components/toastContext.ts";
import {
  invalidateItemData,
  useCategories,
  useCreateItemWithFirstLog,
  useItems,
  useLocations,
  useSettings,
} from "../queries.ts";
import { deleteItem } from "../repo/index.ts";
import { getToday } from "../shared/date.ts";
import type { Category, Item, Location } from "../shared/types.ts";
import {
  buildNewItemSubmission,
  hasDuplicate,
  initialNewItemForm,
  type LastReplaced,
  type NewItemFormErrors,
  type NewItemFormState,
  previewName,
} from "./newItemForm.ts";

// 版面照 docs/prototype/p0.html 的 renderAdd()。
// 這一步不做（P1-14 確認）：拍耗材包裝、物品照片（P2-3）、花費（P2-8）。

const LAST_REPLACED_OPTIONS: { value: LastReplaced; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "other", label: "其他日期" },
  { value: "unknown", label: "不知道" },
];

/** 原型的 selectHTML()：原生下拉選單加上右側的箭頭 */
function Select({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} appearance-none pr-9`}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </div>
  );
}

function NewItemForm({
  locations,
  categories,
  items,
  defaultLeadDays,
}: {
  locations: Location[];
  categories: Category[];
  items: Item[];
  defaultLeadDays: number;
}) {
  const today = getToday();
  const [form, setForm] = useState<NewItemFormState>(() =>
    initialNewItemForm({ locations, categories, defaultLeadDays, today }),
  );
  const [errors, setErrors] = useState<NewItemFormErrors>({});
  const createItem = useCreateItemWithFirstLog();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // 送出後有錯誤時，捲到第一個錯誤訊息（原型在週期沒選時會捲過去）
  useEffect(() => {
    formRef.current
      ?.querySelector("[data-form-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [errors]);

  const set = <K extends keyof NewItemFormState>(
    key: K,
    value: NewItemFormState[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  // 點了週期選項就收起「請選擇週期」的訊息（原型點選時會清掉 F.err）
  const clearCycleError = () => setErrors(({ cycle: _cycle, ...rest }) => rest);

  const duplicate = hasDuplicate(form, items);
  // 同位置同類別已有物品時，補充名稱自動展開且不能收合（原型）
  const labelOpen = form.labelOpen || duplicate;
  const preview = previewName(form, locations, categories);
  const locationName =
    locations.find((location) => location.id === form.locationId)?.name ?? "";
  const categoryName =
    categories.find((category) => category.id === form.categoryId)?.name ?? "";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildNewItemSubmission(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    createItem.mutate(
      { item: result.item, firstLog: result.firstLog },
      {
        onSuccess: ({ item }) => {
          showToast({
            message: `已新增 ${preview}`,
            // 復原＝刪除剛新增的物品，更換紀錄會連帶刪除。
            // 這時新增頁已經離開，所以直接呼叫 repo 並自己讓資料重抓，不依賴這個元件的 hook
            onUndo: () => {
              void deleteItem(item.id)
                .then(() => invalidateItemData(queryClient))
                .catch(() => showToast({ message: "復原失敗，請稍後再試" }));
            },
          });
          void navigate("/");
        },
      },
    );
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
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

      <div className="mt-4 grid grid-cols-2 gap-2.5">
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
      <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">
        白牌、雜牌可以不填
      </p>

      <div
        className={`mt-4 rounded-xl border bg-surface ${duplicate ? "border-soon" : "border-line"}`}
      >
        <button
          type="button"
          onClick={() => set("labelOpen", !form.labelOpen)}
          className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[14px]"
        >
          <span
            className={`text-ink-3 transition-transform ${labelOpen ? "rotate-90" : ""}`}
          >
            <ChevronRight size={15} strokeWidth={1.75} aria-hidden />
          </span>
          補充名稱 <span className="text-ink-3">選填</span>
        </button>
        {labelOpen && (
          <div className="border-t border-line-2 px-3.5 pb-3.5 pt-3">
            <p
              className={`mb-2 text-[12.5px] leading-relaxed ${duplicate ? "text-soon" : "text-ink-3"}`}
            >
              {duplicate
                ? `${locationName}已經有${categoryName}了，填個補充名稱才分得出來。`
                : "同位置、同類別有兩個以上時才需要，例如「水槽」「淨水器 PP」。"}
            </p>
            <input
              aria-label="補充名稱"
              value={form.label}
              onChange={(event) => set("label", event.target.value)}
              placeholder="例如 水槽"
              className={INPUT_CLASS}
            />
          </div>
        )}
      </div>

      <SectionDivider title="更換" />

      <div>
        <p className={LABEL_CLASS}>上次更換</p>
        <div className="flex flex-wrap gap-2">
          {LAST_REPLACED_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set("lastReplaced", option.value)}
              className={chipClass(form.lastReplaced === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {form.lastReplaced === "other" && (
          <>
            <input
              type="date"
              aria-label="上次更換日期"
              value={form.lastDate}
              max={today}
              onChange={(event) => set("lastDate", event.target.value)}
              className={`${INPUT_CLASS} mt-2`}
            />
            <FieldError message={errors.lastDate} />
          </>
        )}
        {form.lastReplaced === "unknown" && (
          <div className="mt-2.5 rounded-xl bg-accent-soft px-3.5 py-3">
            <label
              htmlFor={`${id}-next-due`}
              className="mb-2 block text-[13.5px]"
            >
              那你覺得下次大概什麼時候要換？
            </label>
            <input
              id={`${id}-next-due`}
              type="date"
              value={form.nextDue}
              min={today}
              onChange={(event) => set("nextDue", event.target.value)}
              className={INPUT_CLASS}
            />
            <FieldError message={errors.nextDue} />
          </div>
        )}
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
            clearCycleError();
          }}
        />
        <FieldError message={errors.cycle} />
      </div>

      <div className="mt-4">
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
        <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">
          帶入預設 {defaultLeadDays} 天，可在設定修改預設值
        </p>
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
          placeholder="購買通路、安裝注意事項…"
          className={`${INPUT_CLASS} leading-relaxed`}
        />
      </div>

      {/* 送出失敗時的訊息放在按鈕正上方：按下新增時視線在這裡，放表單最上方會看不到 */}
      {createItem.error !== null && (
        <p className="mt-6 rounded-xl bg-overdue-soft px-3.5 py-3 text-[13px] leading-relaxed text-overdue">
          新增失敗：{createItem.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={createItem.isPending}
        className="mt-6 w-full rounded-xl bg-accent py-4 text-[16px] font-semibold text-accent-ink disabled:opacity-40"
      >
        {createItem.isPending ? "新增中…" : "新增"}
      </button>
      <p className="mt-3 text-center text-[12px] text-ink-3">
        新增時會同時寫入第一筆更換紀錄
      </p>
    </form>
  );
}

/** 載入中：用骨架灰塊佔位。原型沒有這個狀態 */
function FormSkeleton() {
  return (
    <>
      <div className="mt-5 h-[76px] animate-pulse rounded-xl bg-line-2" />
      <div className="mt-4 h-[76px] animate-pulse rounded-xl bg-line-2" />
      <div className="mt-6 h-[200px] animate-pulse rounded-2xl bg-surface-2" />
    </>
  );
}

/** 還沒有任何位置或類別時無法新增物品。原型一定有假資料，沒有這個狀態 */
function NoPlacesState() {
  return (
    <div className="mt-10">
      <p className="text-[15px] text-ink-2">要先建立位置和類別</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        新增物品時要選擇位置與類別，目前還沒有任何位置或類別。
      </p>
      <Link
        to="/settings"
        className="mt-3 inline-block text-[14px] text-accent underline underline-offset-4"
      >
        到設定新增
      </Link>
    </div>
  );
}

function NewItemPage() {
  const locations = useLocations();
  const categories = useCategories();
  const items = useItems();
  const settings = useSettings();
  const queries = [locations, categories, items, settings];

  const failed = queries.find((query) => query.error !== null);
  const retry = () => {
    for (const query of queries) {
      void query.refetch();
    }
  };

  return (
    <>
      <PageHeader title="新增物品" backTo="/" />
      <main data-page="new-item" className="flex-1 px-4 pb-44">
        {failed?.error ? (
          <LoadErrorState error={failed.error} onRetry={retry} />
        ) : !(
            locations.data &&
            categories.data &&
            items.data &&
            settings.data
          ) ? (
          <FormSkeleton />
        ) : locations.data.length === 0 || categories.data.length === 0 ? (
          <NoPlacesState />
        ) : (
          <NewItemForm
            locations={locations.data}
            categories={categories.data}
            items={items.data}
            defaultLeadDays={settings.data.defaultLeadDays}
          />
        )}
      </main>
    </>
  );
}

export default NewItemPage;
