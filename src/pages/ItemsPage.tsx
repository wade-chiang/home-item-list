import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-12 實作
function ItemsPage() {
  return (
    <>
      <PageHeader title="物品" />
      <main data-page="items" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">物品頁：P1-12 實作</p>
      </main>
    </>
  );
}

export default ItemsPage;
