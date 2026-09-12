import { useParams } from "react-router";
import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-17 實作
function EditItemPage() {
  const { itemId } = useParams();

  return (
    <>
      {/* 原型的編輯頁返回詳情頁 */}
      <PageHeader title="編輯物品" backTo={`/items/${itemId ?? ""}`} />
      <main data-page="edit-item" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">編輯物品：P1-17 實作</p>
        <p className="mt-1 font-mono text-[13px] text-ink-3">
          itemId：{itemId}
        </p>
      </main>
    </>
  );
}

export default EditItemPage;
