import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-14 實作
function NewItemPage() {
  return (
    <>
      <PageHeader title="新增物品" backTo="/" />
      <main data-page="new-item" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">新增物品：P1-14 實作</p>
      </main>
    </>
  );
}

export default NewItemPage;
