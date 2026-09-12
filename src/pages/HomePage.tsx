import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-11 實作
function HomePage() {
  return (
    <>
      <PageHeader title="換了沒" />
      <main data-page="home" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">首頁：P1-11 實作</p>
      </main>
    </>
  );
}

export default HomePage;
