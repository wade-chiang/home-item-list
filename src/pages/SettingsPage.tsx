import PageHeader from "../components/PageHeader.tsx";

// 暫時的頁面（P1-10 路由骨架），內容在 P1-19 實作
function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" />
      <main data-page="settings" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-3">設定：P1-19 實作</p>
      </main>
    </>
  );
}

export default SettingsPage;
