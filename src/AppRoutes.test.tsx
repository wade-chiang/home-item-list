import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import AppRoutes from "./AppRoutes.tsx";
import type { NavState } from "./navigation.ts";

// 用 React 的伺服器端渲染檢查路由，不需要 jsdom。只檢查輸出的 HTML，不測點擊。
// 頁面會用 TanStack Query 取資料，所以要有 QueryClientProvider。
// 伺服器端渲染不會執行 effect，查詢不會真的發出請求，頁面停在載入中的畫面，路由與版面骨架照樣檢查得到。
function renderAt(pathname: string, state?: NavState) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname, state }]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** 取出某個分頁的 <a> 標籤，檢查它有沒有標示為目前頁面 */
function tabLink(html: string, tab: string): string {
  const match = html.match(new RegExp(`<a[^>]*data-tab="${tab}"[^>]*>`));
  if (match === null) {
    throw new Error(`找不到分頁 ${tab}`);
  }
  return match[0];
}

const isActive = (html: string, tab: string) =>
  tabLink(html, tab).includes('aria-current="page"');

describe("網址對應", () => {
  it.each([
    { url: "/", page: "home" },
    { url: "/items", page: "items" },
    { url: "/items/new", page: "new-item" },
    { url: "/items/abc123", page: "item-detail" },
    { url: "/items/abc123/edit", page: "edit-item" },
    { url: "/settings", page: "settings" },
    { url: "/nope", page: "not-found" },
    { url: "/items/abc123/edit/extra", page: "not-found" },
  ])("$url 顯示 $page", ({ url, page }) => {
    expect(renderAt(url)).toContain(`data-page="${page}"`);
  });

  it("詳情頁與編輯頁拿得到網址裡的 itemId", () => {
    expect(renderAt("/items/abc123")).toContain("abc123");
    expect(renderAt("/items/abc123/edit")).toContain("abc123");
  });
});

describe("底部分頁的標示", () => {
  it("在分頁本身時標示該分頁", () => {
    expect(isActive(renderAt("/"), "home")).toBe(true);
    expect(isActive(renderAt("/items"), "items")).toBe(true);
    expect(isActive(renderAt("/settings"), "settings")).toBe(true);
    expect(isActive(renderAt("/settings"), "home")).toBe(false);
  });

  it("從首頁進入詳情頁時，仍標示首頁", () => {
    const html = renderAt("/items/abc123", { from: "home" });
    expect(isActive(html, "home")).toBe(true);
    expect(isActive(html, "items")).toBe(false);
  });

  it("直接輸入網址進入詳情頁時，標示物品", () => {
    const html = renderAt("/items/abc123");
    expect(isActive(html, "items")).toBe(true);
    expect(isActive(html, "home")).toBe(false);
  });
});

describe("新增按鈕與返回鍵", () => {
  it.each(["/", "/items"])("%s 有新增按鈕", (url) => {
    expect(renderAt(url)).toContain('aria-label="新增物品"');
  });

  it.each(["/items/abc123", "/items/new", "/settings"])(
    "%s 沒有新增按鈕",
    (url) => {
      expect(renderAt(url)).not.toContain('aria-label="新增物品"');
    },
  );

  it.each(["/items/abc123", "/items/new", "/items/abc123/edit"])(
    "%s 有返回鍵",
    (url) => {
      expect(renderAt(url)).toContain('aria-label="返回"');
    },
  );

  it.each(["/", "/items", "/settings"])("%s 沒有返回鍵", (url) => {
    expect(renderAt(url)).not.toContain('aria-label="返回"');
  });
});
