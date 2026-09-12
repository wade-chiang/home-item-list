import { Route, Routes } from "react-router";
import AppLayout from "./components/AppLayout.tsx";
import ToastProvider from "./components/ToastProvider.tsx";
import EditItemPage from "./pages/EditItemPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import ItemDetailPage from "./pages/ItemDetailPage.tsx";
import ItemsPage from "./pages/ItemsPage.tsx";
import NewItemPage from "./pages/NewItemPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";

// 網址對應（P1-10 確認）：只有整頁畫面有網址；換好了、暫停、編輯更換紀錄等底部面板不佔網址。
// items/new 與 items/:itemId 不衝突：React Router 優先配對寫死的路徑。
// 提示條包在版面外層：換頁時版面不會重新掛載，提示條才不會跟著消失。
function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ToastProvider>
            <AppLayout />
          </ToastProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="items">
          <Route index element={<ItemsPage />} />
          <Route path="new" element={<NewItemPage />} />
          <Route path=":itemId" element={<ItemDetailPage />} />
          <Route path=":itemId/edit" element={<EditItemPage />} />
        </Route>
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
