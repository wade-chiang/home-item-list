import { useParams } from "react-router";
import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-13 實作。標題屆時改成物品的顯示名稱
function ItemDetailPage() {
  const { itemId } = useParams();

  return (
    <>
      <PageHeader title="物品詳情" backTo="/" />
      <main data-page="item-detail" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">物品詳情：P1-13 實作</p>
        <p className="mt-1 font-mono text-[13px] text-ink-3">
          itemId：{itemId}
        </p>
      </main>
    </>
  );
}

export default ItemDetailPage;
