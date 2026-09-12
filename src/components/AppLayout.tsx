import { House, List, Plus, Settings } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";
import { type NavState, sourceTabOf } from "../navigation.ts";

type Tab = "home" | "items" | "settings";

const TABS = [
  { tab: "home", to: "/", label: "首頁", Icon: House },
  { tab: "items", to: "/items", label: "物品", Icon: List },
  { tab: "settings", to: "/settings", label: "設定", Icon: Settings },
] as const;

/** 要標示的分頁。子畫面（/items/...）標示進來時的分頁；直接輸入網址進來時沒有紀錄，預設「物品」 */
function activeTabOf(pathname: string, state: unknown): Tab | null {
  if (pathname === "/") {
    return "home";
  }
  if (pathname === "/items") {
    return "items";
  }
  if (pathname === "/settings") {
    return "settings";
  }
  if (pathname.startsWith("/items/")) {
    return sourceTabOf(state) ?? "items";
  }
  return null;
}

// 版面照 docs/prototype/p0.html：底部三個分頁，右下角新增按鈕只在首頁與物品頁出現。
// 標題列由各頁自己放（PageHeader），因為詳情頁的標題要等資料載入才知道。
function AppLayout() {
  const location = useLocation();
  const activeTab = activeTabOf(location.pathname, location.state);
  const showFab = location.pathname === "/" || location.pathname === "/items";
  const fabState: NavState = { from: activeTab === "home" ? "home" : "items" };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-ground min-[460px]:border-x min-[460px]:border-line">
      <Outlet />

      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[430px] border-t border-line bg-surface pt-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {TABS.map(({ tab, to, label, Icon }) => {
          const active = tab === activeTab;
          return (
            <Link
              key={tab}
              to={to}
              data-tab={tab}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] ${active ? "font-medium text-accent" : "text-ink-3"}`}
            >
              <Icon size={21} strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      {showFab && (
        <Link
          to="/items/new"
          state={fabState}
          aria-label="新增物品"
          className="fixed z-30 grid h-14 w-14 place-items-center rounded-[18px] bg-accent text-accent-ink shadow-lg"
          style={{
            right: "max(16px, calc(50vw - 215px + 16px))",
            bottom: "calc(78px + env(safe-area-inset-bottom))",
          }}
        >
          <Plus size={26} strokeWidth={2.2} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default AppLayout;
